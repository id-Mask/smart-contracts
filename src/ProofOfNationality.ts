import {
  Field,
  method,
  Signature,
  SmartContract,
  Permissions,
  PublicKey,
  Struct,
  ZkProgram,
  Provable,
} from 'o1js';

import { PersonalData } from './ProofOfAge.utils.js';

class PublicOutput extends Struct({
  nationality: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
}) {}

export const proofOfNationality = ZkProgram({
  name: 'ZkProofOfNationality',
  publicInput: undefined,
  publicOutput: PublicOutput, // defined above
  methods: {
    proveNationality: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature
        Signature, // creator wallet signature
        PublicKey, // creator wallet public key
      ],
      async method(
        personalData: PersonalData,
        signature: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey
      ) {
        // verify zkOracle data
        const oraclePuclicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );
        const validSignature = signature.verify(
          oraclePuclicKey,
          personalData.toFields()
        );
        validSignature.assertTrue();

        // verify creator signature
        const validSignature_ = creatorSignature.verify(
          creatorPublicKey,
          personalData.toFields()
        );
        validSignature_.assertTrue();

        /*
          Nationality is expressed as a single Field element which can be mapped
          back to 2 letter country code: https://asecuritysite.com/coding/asc2
          see utils file for details
        */
        const firstChar = personalData.country.values[0].value;
        const secondChar = personalData.country.values[1].value;
        const nationality = firstChar.mul(100).add(secondChar);

        return {
          publicOutput: {
            nationality: nationality,
            currentDate: personalData.currentDate,
            creatorPublicKey: creatorPublicKey,
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
export class ProofOfNationalityProof extends ZkProgram.Proof(
  proofOfNationality
) {}

export class ProofOfNationality extends SmartContract {
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
  @method async verifyProof(proof: ProofOfNationalityProof) {
    proof.verify();
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
