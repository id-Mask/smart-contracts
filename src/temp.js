import { PrivateKey, Signature, Field } from 'o1js';

const privateKey = PrivateKey.random();
const publicKey = privateKey.toPublicKey();

const keys = {
  privateKey: privateKey.toBase58(),
  publicKey: publicKey.toBase58(),
};

const signature = Signature.create(privateKey, [Field(1), Field(2), Field(3)]);

console.log(JSON.stringify(signature.toJSON(), null, 2));

const isValid = signature
  .verify(publicKey, [Field(1), Field(2), Field(3)])
  .toBoolean();

console.log(isValid);
