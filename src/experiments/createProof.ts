import { Field, ZkProgram, Cache } from 'o1js';
import fs from 'fs';

export const myProgram = ZkProgram({
  name: 'myProgram',
  publicOutput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      async method(value: Field): Promise<Field> {
        value.assertEquals(Field(1));
        return Field(1);
      },
    },
  },
});

// create proof
const cache: Cache = Cache.FileSystem('./cache');
await myProgram.compile({ cache });
const proof = await myProgram.prove(Field(1));
await fs.promises.writeFile('proof.json', JSON.stringify(proof.toJSON()));
