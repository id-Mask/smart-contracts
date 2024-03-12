import { Field, ZkProgram, verify, Cache, JsonProof } from 'o1js';
import fs from 'fs';
import { myProgram } from './createProof.js';

// export const myProgram = ZkProgram({
//   name: 'myProgram',
//   publicOutput: Field,
//   methods: {
//     prove: {
//       privateInputs: [Field],
//       method(value: Field): Field {
//         value.assertEquals(Field(1));
//         return Field(1);
//       },
//     },
//   },
// });

// verify proof
const cache: Cache = Cache.FileSystem('./cache');
const { verificationKey } = await myProgram.compile({ cache });
const proof = JSON.parse(fs.readFileSync('./proof.json', 'utf-8'));
console.log('verifying');
let ok = await verify(proof as JsonProof, verificationKey);
console.log(ok);
