import { Field, method, ZkProgram, SmartContract } from 'o1js';

export const myProgram = ZkProgram({
  name: 'myProgram',
  publicOutput: Field,
  methods: {
    method: {
      privateInputs: [Field],
      async method(value: Field): Promise<Field> {
        value.assertEquals(Field(0));
        return Field(1);
      },
    },
  },
});

export class ProofOfMyProgram extends ZkProgram.Proof(myProgram) {}

export class MyContract extends SmartContract {
  @method async verifyProof(proof: ProofOfMyProgram) {
    proof.verify();
  }
}
