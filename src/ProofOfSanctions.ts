import {
  Field,
  method,
  Experimental,
  Signature,
  CircuitString,
  Bool,
  SmartContract,
  State,
  state,
  Provable,
  Permissions,
  Struct,
} from 'o1js';

import { verifyOracleData } from './ProofOfSanctions.utils.js';

export class PublicInput extends Struct({
  isMatched: Bool,
  minScore: Field,
  currentDate: Field,
}) {}

export const proofOfSanctions = Experimental.ZkProgram({
  publicInput: PublicInput, // defined above
  publicOutput: Field, // isMatched
  methods: {
    proveSanctions: {
      privateInputs: [
        Signature, // zkOracle data signature
      ],
      method(publicInput: PublicInput, signature: Signature): Field {
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
        return publicInput.minScore;
      },
    },
  },
});

/*
Use the zkPragram defined above to create an on-chain smart contract that
consume the proof created by the program above and thus 'put' the proof on chain
*/
export class ProofOfSanctionsProof extends Experimental.ZkProgram.Proof(
  proofOfSanctions
) {}

export class ProofOfSanctions extends SmartContract {
  events = {
    'provided-valid-proof': Field,
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
    // its impossible to run past this withought a valid proof
    proof.verify();

    // the above is enough to be able to check if an address has a proof
    // but there needs to be a way to save the min score that is proved
    // emit an event with min score to be able to query it via archive nodes

    // surely events are not designed for this, but it will do the trick..?
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
