/*
I want to create a SmartContract method, that consume and verify specified proof.

Reading over other examples, I understood that this is possible by specifying the proof class in the method args
(this bakes in the program's verification key inside the smart contract's verification key), i.e.
class MyProgram extends Experimental.ZkProgram.Proof(myProgram) {}
@method verifyProof(proof: MyProgram) { proof.verify() }

But it does not seem to work in the example below. What am I doing wrong?

https://discord.com/channels/484437221055922177/1125872479030747136/1125875896302194708
https://discord.com/channels/484437221055922177/1080552939313184859/1080598740890562691
*/

import { Field, Bool, ZkProgram, Struct, CircuitString } from 'o1js';

class zkProofOutput extends Struct({
  proofValid: Bool,
  currentDate: CircuitString,
}) {}

const myProgram = ZkProgram({
  name: 'myProgram',
  publicOutput: zkProofOutput,
  methods: {
    prove: {
      privateInputs: [Field],
      async method(value: Field) {
        value.assertEquals(Field(1));
        return {
          publicOutput: {
            proofValid: Bool(true),
            currentDate: CircuitString.fromString('2025-01-01'),
          },
        };
      },
    },
  },
});

// run
await myProgram.compile();
const { proof } = await myProgram.prove(Field(1));
console.log(JSON.stringify(proof.toJSON()).substring(0, 300));
