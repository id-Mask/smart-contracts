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

import { verifyOracleData } from './ProofOfSanctions.utils.js';

import { PassKeysParams, Secp256r1 } from './proof.utils.js';

export class PublicInput extends Struct({
  isMatched: Bool,
  minScore: Field,
  currentDate: Field,
}) {
  toFields(): Field[] {
    return [this.isMatched.toField(), this.minScore, this.currentDate];
  }
}

class PublicOutput extends Struct({
  minScore: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
}) {}

export const proofOfSanctions = ZkProgram({
  name: 'ZkProofOfSanctions',
  publicInput: PublicInput, // defined above
  publicOutput: PublicOutput, // defined above
  methods: {
    proveSanctions: {
      privateInputs: [
        Signature, // zkOracle data signature
        Signature, // creator wallet signature
        PublicKey, // creator wallet public key
        PassKeysParams, // passkeys params
      ],
      async method(
        publicInput: PublicInput,
        signature: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey,
        PassKeysParams: PassKeysParams
      ) {
        // verify zkOracle data
        const validSignatureOracle = verifyOracleData(
          publicInput.isMatched,
          publicInput.minScore,
          publicInput.currentDate,
          signature
        );
        validSignatureOracle.assertTrue();

        // verify creator wallet signature
        const validSignatureWallet = creatorSignature.verify(
          creatorPublicKey,
          publicInput.toFields()
        );
        validSignatureWallet.assertTrue();

        // verify passkeys signature
        const validSignaturePassKeys =
          PassKeysParams.signature.verifySignedHash(
            PassKeysParams.payload,
            PassKeysParams.publicKey
          );
        validSignaturePassKeys.assertTrue();

        // assert that search agains OFAC db yielded no results
        publicInput.isMatched.assertFalse();

        return {
          publicOutput: {
            minScore: publicInput.minScore,
            currentDate: publicInput.currentDate,
            creatorPublicKey: creatorPublicKey,
            passkeysPublicKey: PassKeysParams.publicKey,
            passkeysId: PassKeysParams.id,
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
