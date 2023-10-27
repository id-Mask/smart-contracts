import { Field, method, Experimental, SmartContract } from 'o1js';

export const myProgram = Experimental.ZkProgram({
  publicOutput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      method(value: Field): Field {
        value.assertEquals(Field(1));
        return Field(1);
      },
    },
  },
});

export class MyProgram extends Experimental.ZkProgram.Proof(myProgram) {}

export class myContract extends SmartContract {
  @method verifyProof(proof: MyProgram) {
    proof.verify();
  }
}
