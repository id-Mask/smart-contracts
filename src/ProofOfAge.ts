import {
  Field,
  method,
  Signature,
  SmartContract,
  Permissions,
  PublicKey,
  Struct,
  ZkProgram,
} from 'o1js';

import { PersonalData, PassKeysParams, Secp256r1 } from './proof.utils.js';

import { parseDateFromPNO } from './ProofOfAge.utils.js';

class PublicOutput extends Struct({
  ageToProveInYears: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
  isMockData: Field,
}) {}

export const proofOfAge = ZkProgram({
  name: 'ZkProofOfAge',
  publicInput: Field, // ageToProveInYears
  publicOutput: PublicOutput, // defined above
  methods: {
    proveAge: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature
        Signature, // creator wallet signature
        PublicKey, // creator wallet public key
        PassKeysParams, // passkeys params
      ],
      async method(
        ageToProveInYears: Field,
        personalData: PersonalData,
        oracleSignature: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey,
        PassKeysParams: PassKeysParams
      ) {
        /*
          Validate ageToProveInYears input to make sure we do not go into the negatives 
          and keep the age generally in reasonable range.
          Note: audit's fidning 3.3
        */
        ageToProveInYears.assertGreaterThan(0);
        ageToProveInYears.assertLessThan(200);

        /*
          Verify zk-oracle signature

          Purpose: verify the zk-oracle signature, ensuring that the data remains 
          untampered with and aligns precisely with the information provided by 
          the KYC/digital ID provider.
        */
        const validSignatureOracle = oracleSignature.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          personalData.toFields()
        );
        validSignatureOracle.assertTrue();

        /*
          Verify creatorSignature

          Purpose: This section validates the creatorSignature to embed the public key 
          of the proof creator into the proof output. The rationale behind this inclusion 
          is to enable the party consuming the proof to optionally request the user to 
          confirm possession of the same address. This confirmation can be achieved by 
          prompting the user to sign a superficial message and provide evidence of ownership 
          of the corresponding account.
        */
        const validSignatureWallet = creatorSignature.verify(
          creatorPublicKey,
          personalData.toFields()
        );
        validSignatureWallet.assertTrue();

        /*
          verify passkeys signature: The rationale behind this is to bind the proof to passkeys.
          same as with creatorSignature. In fact this is a better replacement for it. We can 
          depreciate creatorSignature in the future.  
        */
        const validSignaturePassKeys =
          PassKeysParams.signature.verifySignedHash(
            PassKeysParams.payload,
            PassKeysParams.publicKey
          );
        validSignaturePassKeys.assertTrue();

        // parse date of birth from pno
        const dateOfBirth = parseDateFromPNO(personalData.pno);

        // edge case: https://discord.com/channels/484437221055922177/1136989663152840714
        personalData.currentDate.greaterThan(dateOfBirth).assertTrue();

        // verify that (current date - age to prove) > date of birth
        // note: audit's finding 3.6
        const olderThanAgeToProve = personalData.currentDate
          .sub(ageToProveInYears.mul(Field(10000)))
          .greaterThanOrEqual(dateOfBirth);
        olderThanAgeToProve.assertTrue();

        return {
          publicOutput: {
            ageToProveInYears: ageToProveInYears,
            currentDate: personalData.currentDate,
            creatorPublicKey: creatorPublicKey,
            passkeysPublicKey: PassKeysParams.publicKey,
            passkeysId: PassKeysParams.id,
            isMockData: personalData.isMockData,
          },
        };
      },
    },
  },
});

/*
Use the zkPragram defined above to create an on-chain smart contract that
consume the proof created by the program above and thus 'put' the proof on chain
*/
export class ProofOfAgeProof extends ZkProgram.Proof(proofOfAge) {}

export class ProofOfAge extends SmartContract {
  events = {
    'provided-valid-proof': PublicOutput,
  };
  init() {
    super.init();
    // https://docs.minaprotocol.com/zkapps/o1js/permissions#types-of-permissions
    this.account.permissions.set({
      ...Permissions.default(),
    });
  }
  @method async verifyProof(proof: ProofOfAgeProof) {
    // if the proof is invalid, this will fail
    // its impossible to run past this withought a valid proof
    proof.verify();

    // the above is enough to be able to check if an address has a proof
    // but there needs to be a way to save the number of years that are proved
    // emit an event with number of years to be able to query it via archive nodes

    // surely events are not designed for this, but it will do the trick..?
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
