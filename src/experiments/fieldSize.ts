/*
Provable comparison functions can only be used on Fields of size <= 253 bits, got 255 bits.
*/

import { Field, method, ZkProgram, Provable } from 'o1js';

const myProgram = ZkProgram({
  name: 'myProgram',
  methods: {
    prove: {
      privateInputs: [Field, Field, Field],
      async method(number1: Field, number2: Field, number3: Field) {
        number1.sub(number2).greaterThan(number3);
      },
    },
  },
});

// create proofs
await myProgram.compile();

// throws the error because of negative Field value
const proof = await myProgram.prove(Field(10), Field(11), Field(5));
