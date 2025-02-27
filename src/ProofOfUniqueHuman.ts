import {
  Field,
  method,
  Signature,
  SmartContract,
  Permissions,
  Struct,
  ZkProgram,
  Poseidon,
  CircuitString,
  PublicKey,
} from 'o1js';

import { PersonalData, PassKeysParams, Secp256r1 } from './proof.utils.js';

class PublicOutput extends Struct({
  hash: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
  isMockData: Field,
}) {}

export const proofOfUniqueHuman = ZkProgram({
  name: 'ZkProofOfUniqueHuman',
  publicInput: undefined,
  publicOutput: PublicOutput,
  methods: {
    proveUniqueHuman: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature
        CircuitString, // unique secret value
        Signature, // signature of unique secret value
        Signature, // creator wallet signature
        PublicKey, // creator wallet public key
        PassKeysParams, // passkeys params
      ],
      async method(
        personalData: PersonalData,
        personalDataSignature: Signature,
        secretValue: CircuitString,
        secretValueSignature: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey,
        PassKeysParams: PassKeysParams
      ) {
        const oraclePublicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );

        // verify data inputs
        const validSignatureOracle = personalDataSignature.verify(
          oraclePublicKey,
          personalData.toFields()
        );
        validSignatureOracle.assertTrue();

        /*
          Why use SecretValue?

          When the hash of name, surname, and personal identification number is 
          made public (e.g., hash(name, surname, pno)), it poses a privacy risk. 
          Anyone with knowledge of someone's data could potentially track them 
          down by computing the hash. To mitigate this risk, use salt value that 
          is unique to each person. This salt value is provided by the zkOracle.
          Instead of: hash(name, surname, pno), do: hash(name, surname, pno, secretvalue)

        */
        const validSecretValue = secretValueSignature.verify(
          oraclePublicKey,
          secretValue.values.map((item) => item.toField())
        );
        validSecretValue.assertTrue();

        // verify creator signature
        const validSignatureWallet = creatorSignature.verify(
          creatorPublicKey,
          personalData.toFields()
        );
        validSignatureWallet.assertTrue();

        // verify passkeys signature
        const validSignaturePassKeys =
          PassKeysParams.signature.verifySignedHash(
            PassKeysParams.payload,
            PassKeysParams.publicKey
          );
        validSignaturePassKeys.assertTrue();

        /*
          Use personal number (pno) and secret value for the hash, not name or surname:
          - Names and surnames can change (e.g., marriage, legal name change), so they're unreliable identifiers.
          - Personal numbers are immutable and unique, making them stable identifiers.
        */
        const hash = Poseidon.hash([
          // ...personalData.name.values.map((item) => item.toField()),
          // ...personalData.surname.values.map((item) => item.toField()),
          ...personalData.pno.values.map((item) => item.toField()),
          ...secretValue.values.map((item) => item.toField()),
        ]);

        return {
          publicOutput: {
            hash: hash,
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
export class ProofOfUniqueHumanProof extends ZkProgram.Proof(
  proofOfUniqueHuman
) {}

export class ProofOfUniqueHuman extends SmartContract {
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
  @method async verifyProof(proof: ProofOfUniqueHumanProof) {
    proof.verify();
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
