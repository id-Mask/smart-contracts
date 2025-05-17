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

import {
  PersonalData,
  PassKeys,
  CreatorAccount,
  Secp256r1,
} from './proof.utils.js';

class PublicOutput extends Struct({
  nationality: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
  isMockData: Field,
}) {}

export const proofOfNationality = ZkProgram({
  name: 'ZkProofOfNationality',
  publicInput: undefined,
  publicOutput: PublicOutput, // defined above
  methods: {
    proveNationality: {
      privateInputs: [
        PersonalData,
        CreatorAccount,
        PassKeys, // passkeys params
      ],
      async method(
        personalData: PersonalData,
        creatorAccount: CreatorAccount,
        PassKeys: PassKeys
      ) {
        // verify zkOracle data
        const validSignatureOracle = personalData.signature.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          personalData.toFields()
        );
        validSignatureOracle.assertTrue();

        // verify creator signature
        const validSignatureWallet = creatorAccount.signature.verify(
          creatorAccount.publicKey,
          personalData.toFields()
        );
        validSignatureWallet.assertTrue();

        // verify passkeys signature
        const validSignaturePassKeys = PassKeys.signature.verifySignedHash(
          PassKeys.payload,
          PassKeys.publicKey
        );
        validSignaturePassKeys.assertTrue();

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
            creatorPublicKey: creatorAccount.publicKey,
            passkeysPublicKey: PassKeys.publicKey,
            passkeysId: PassKeys.id,
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
