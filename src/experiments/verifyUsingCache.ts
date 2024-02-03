import { Field, ZkProgram, verify, Cache } from 'o1js';
import fs from 'fs';

export const myProgram = ZkProgram({
  name: 'myProgram',
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

// create proofs
const cache: Cache = Cache.FileSystem('./cache');
await myProgram.compile({ cache });
const proof = await myProgram.prove(Field(1));
await fs.promises.writeFile('proof.json', JSON.stringify(proof.toJSON()));

// verify proof
const proof_ = JSON.parse(fs.readFileSync('proof.json', 'utf-8'));
const { verificationKey } = await myProgram.compile({ cache });
console.log('verifying');
let ok = await verify(proof_, verificationKey);
console.log(ok);
