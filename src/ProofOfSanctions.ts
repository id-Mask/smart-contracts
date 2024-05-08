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
      ],
      async method(
        publicInput: PublicInput,
        signature: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey
      ): Promise<PublicOutput> {
        // verity zkOracle data
        const verified = verifyOracleData(
          publicInput.isMatched,
          publicInput.minScore,
          publicInput.currentDate,
          signature
        );
        verified.assertTrue();

        // verify creator signature
        const validSignature_ = creatorSignature.verify(
          creatorPublicKey,
          publicInput.toFields()
        );
        validSignature_.assertTrue();

        // assert that search agains OFAC db yielded no results
        publicInput.isMatched.assertFalse();

        return new PublicOutput({
          minScore: publicInput.minScore,
          currentDate: publicInput.currentDate,
          creatorPublicKey: creatorPublicKey,
        });
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
