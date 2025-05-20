import {
  Field,
  method,
  Signature,
  Bool,
  SmartContract,
  Permissions,
  Struct,
  ZkProgram,
  PublicKey,
} from 'o1js';

import {
  PersonalData,
  PassKeys,
  CreatorAccount,
  Secp256r1,
} from './proof.utils.js';

import { SanctionsData } from './ProofOfSanctions.utils.js';

class PublicOutput extends Struct({
  minScore: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
  isMockData: Field,
}) {}

export const proofOfSanctions = ZkProgram({
  name: 'ZkProofOfSanctions',
  publicInput: SanctionsData,
  publicOutput: PublicOutput, // defined above
  methods: {
    proveSanctions: {
      privateInputs: [
        PersonalData,
        CreatorAccount,
        PassKeys, // passkeys params
      ],
      async method(
        sanctionsData: SanctionsData,
        personalData: PersonalData,
        creatorAccount: CreatorAccount,
        PassKeys: PassKeys
      ) {
        // verify personalData
        const validSignatureOracle = personalData.signature.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          personalData.toFields()
        );
        validSignatureOracle.assertTrue();

        // verify sanctionsData
        const validSignatureSanctionsData = sanctionsData.signature.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          sanctionsData.toFields()
        );
        validSignatureSanctionsData.assertTrue();

        // verify creatorAccount
        const validSignatureWallet = creatorAccount.signature.verify(
          creatorAccount.publicKey,
          sanctionsData.toFields()
        );
        validSignatureWallet.assertTrue();

        // verify PassKeys
        const validSignaturePassKeys = PassKeys.signature.verifySignedHash(
          PassKeys.payload,
          PassKeys.publicKey
        );
        validSignaturePassKeys.assertTrue();

        // assert that search agains OFAC db yielded no results
        sanctionsData.isMatched.assertFalse();

        return {
          publicOutput: {
            minScore: sanctionsData.minScore,
            currentDate: sanctionsData.currentDate,
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
export class ProofOfSanctionsProof extends ZkProgram.Proof(proofOfSanctions) {}

export class ProofOfSanctions extends SmartContract {
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
  @method async verifyProof(proof: ProofOfSanctionsProof) {
    proof.verify();
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
