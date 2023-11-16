import { PrivateKey } from 'o1js';

const privateKey = PrivateKey.random();
const publicKey = privateKey.toPublicKey();

const keys = {
  privateKey: privateKey.toBase58(),
  publicKey: publicKey.toBase58(),
};

console.log(JSON.stringify(keys, null, 2));
