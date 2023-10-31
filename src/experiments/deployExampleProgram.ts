/*
Cannot deploy using CLI, because SmartContract depends on other zkProgram.
https://discord.com/channels/484437221055922177/1080869811204141146/1080869811204141146

Error: Failed to send transaction {
  statusCode: 200,
  statusText: "Couldn't send zkApp command: (Verification_failed\n" +
    ' "Invalid_signature: [B62qqpAFkz374qJpuFKYZPjT1KxSmnLoY4zEc878FaW4DSxgYNXZiny]")'
}
https://discord.com/channels/484437221055922177/1151810908331450398/1151810908331450398
*/

import { PrivateKey, Mina } from 'o1js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import fs from 'fs/promises';

import { myProgram, myContract } from './exampleProgram.js';

// parse config and private key from file
let deployAlias = 'berkeley';
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
console.log(config);

let feePayerBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkappKeyBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

// contract keys
let zkappKey = PrivateKey.fromBase58(zkappKeyBase58.privateKey);
let zkappAddress = zkappKey.toPublicKey();
console.log(zkappKey.toBase58(), zkappAddress.toBase58());

// fee payer keys
let feePayerKey = PrivateKey.fromBase58(feePayerBase58.privateKey);
let feePayerAddress = feePayerKey.toPublicKey();
console.log(feePayerKey.toBase58(), feePayerAddress.toBase58());

// set up Mina instance
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9;
Mina.setActiveInstance(Network);

// compile
console.log('compile the contracts...');
await myProgram.compile();
const { verificationKey } = await myContract.compile();

// create transaction, sign and send
console.log('creating transaction');
let tx = await Mina.transaction({ sender: feePayerAddress, fee: fee }, () => {
  new myContract(zkappAddress).deploy({ verificationKey });
});
let signedTx = await tx.sign([feePayerKey, zkappKey]);
console.log(signedTx.toJSON());
let sentTx = await signedTx.send();
console.log(sentTx);
