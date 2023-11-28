import {
  Field,
  method,
  Signature,
  Bool,
  SmartContract,
  Permissions,
  Struct,
  ZkProgram,
} from 'o1js';

import { verifyOracleData } from './ProofOfSanctions.utils.js';

export class PublicInput extends Struct({
  isMatched: Bool,
  minScore: Field,
  currentDate: Field,
}) {}

class PublicOutput extends Struct({
  minScore: Field,
  currentDate: Field,
}) {}

export const proofOfSanctions = ZkProgram({
  name: 'proofOfSanctions',
  publicInput: PublicInput, // defined above
  publicOutput: PublicOutput, // defined above
  methods: {
    proveSanctions: {
      privateInputs: [
        Signature, // zkOracle data signature
      ],
      method(publicInput: PublicInput, signature: Signature): PublicOutput {
        // verity zkOracle data
        const verified = verifyOracleData(
          publicInput.isMatched,
          publicInput.minScore,
          publicInput.currentDate,
          signature
        );
        verified.assertTrue();
        // assert that search agains OFAC db yielded no results
        publicInput.isMatched.assertFalse();

        return new PublicOutput({
          minScore: publicInput.minScore,
          currentDate: publicInput.currentDate,
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
  @method verifyProof(proof: ProofOfSanctionsProof) {
    // if the proof is invalid, this will fail
    // its impossible to run past this without a valid proof
    proof.verify();

    // the above is enough to be able to check if an address has a proof
    // but there needs to be a way to save the min score that is proved
    // emit an event with min score to be able to query it via archive nodes

    // surely events are not designed for this, but it will do the trick..?
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
