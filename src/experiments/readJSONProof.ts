import { Field, ZkProgram, JsonProof } from 'o1js';
import fs from 'fs';

// define the program
const MyProgram = ZkProgram({
  name: 'myProgram',
  methods: {
    method: {
      privateInputs: [Field],
      async method(input: Field) {
        input.assertEquals(Field(0));
      },
    },
  },
});

class ProofOfMyProgram extends ZkProgram.Proof(MyProgram) {}

// compile and save proof as JSON
let { verificationKey } = await MyProgram.compile();
let { proof } = await MyProgram.method(Field(0));
const proofJson = proof.toJSON();
console.log(proofJson);

// load proof from JSON
const proof_ = ProofOfMyProgram.fromJSON(proofJson as JsonProof);
console.log(proof_);

/*
Below is how you would load a json saved proof
*/

// import { JsonProof } from 'o1js';
// import { ProofOfAgeProof } from '.././ProofOfAge.js';
// import fs from 'fs/promises';
//
// import proof from '.././proof.json' assert { type: "json" };
// console.log(proof.publicInput);
// const proof_ = ProofOfAgeProof.fromJSON(proof as JsonProof);
// console.log(proof_);
