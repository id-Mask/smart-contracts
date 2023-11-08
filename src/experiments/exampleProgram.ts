import { Field, method, Experimental, SmartContract } from 'o1js';

export const myProgram = Experimental.ZkProgram({
  publicOutput: Field,
  methods: {
    method: {
      privateInputs: [Field],
      method(value: Field): Field {
        value.assertEquals(Field(0));
        return Field(1);
      },
    },
  },
});

export class ProofOfMyProgram extends Experimental.ZkProgram.Proof(myProgram) {}

export class MyContract extends SmartContract {
  @method verifyProof(proof: ProofOfMyProgram) {
    proof.verify();
  }
}
