/*
Cannot deploy using CLI, because SmartContract depends on other zkProgram.
https://discord.com/channels/484437221055922177/1080869811204141146/1080869811204141146

Error: Failed to send transaction {
  statusCode: 200,
  statusText: "Couldn't send zkApp command: (Verification_failed\n" +
    ' "Invalid_signature: [B62qqpAFkz374qJpuFKYZPjT1KxSmnLoY4zEc878FaW4DSxgYNXZiny]")'
}
https://discord.com/channels/484437221055922177/1151810908331450398/1151810908331450398

Solution: https://discord.com/channels/484437221055922177/1047214314349658172/threads/1167472139574714599
*/

import {
  PrivateKey,
  Mina,
  AccountUpdate,
  UInt32,
  fetchAccount,
  Cache,
} from 'o1js';
import fs from 'fs/promises';

import { proofOfAge, ProofOfAge } from './ProofOfAge.js';
import { proofOfSanctions, ProofOfSanctions } from './ProofOfSanctions.js';

// proofs map
interface Proofs {
  [key: string]: { zkProgram: any; smartContract: any };
}

const proofs: Proofs = {
  ProofOfAge: { zkProgram: proofOfAge, smartContract: ProofOfAge },
  ProofOfSanctions: {
    zkProgram: proofOfSanctions,
    smartContract: ProofOfSanctions,
  },
};

// parse config and private key from file
let deployAlias = process.argv[2];
if (!deployAlias) throw Error('Missing <deployAlias> argument');
Error.stackTraceLimit = 1000;

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

let feePayerBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeyBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

// contract keys
let zkAppKey = PrivateKey.fromBase58(zkAppKeyBase58.privateKey);
let zkAppAddress = zkAppKey.toPublicKey();

const deployData = {
  program: deployAlias,
  toPublicKey: zkAppKeyBase58.publicKey,
};
console.log(JSON.stringify(deployData, null, 2));

// fee payer keys
let feePayerKey = PrivateKey.fromBase58(feePayerBase58.privateKey);
let feePayerAddress = feePayerKey.toPublicKey();

// set up Mina instance
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9;
Mina.setActiveInstance(Network);

// fetch to get all the account data including nonce?
await fetchAccount({ publicKey: zkAppAddress });
await fetchAccount({ publicKey: feePayerAddress });

// compile
console.log('compile the contracts...');
const cache = Cache.FileSystem('./cache');
await proofs[deployAlias].zkProgram.compile({ cache: cache });
const { verificationKey } = await proofs[deployAlias].smartContract.compile();
const zkApp = new proofs[deployAlias].smartContract(zkAppAddress);

// create transaction, sign and send
console.log('creating transaction');
let tx = await Mina.transaction({ sender: feePayerAddress, fee: fee }, () => {
  // deploy to a new address (empty account)
  // zkApp.deploy({ verificationKey });
  // zkApp.zkappURI.set('https://idmask.xyz');

  // redeploy by setting new verificationKey
  // https://discord.com/channels/484437221055922177/1086325036643790998/1088450285292224562
  // https://discord.com/channels/484437221055922177/915745847692636181/1000675690842177547
  // https://discord.com/channels/484437221055922177/1168554028851011614
  let update = AccountUpdate.create(zkAppAddress);
  update.account.verificationKey.set(verificationKey);
  update.account.zkappUri.set('https://idmask.xyz');
  update.sign(zkAppKey);
  // update.account.nonce.assertEquals(UInt32.from(1));
});

console.log('before sending');
let signedTx = await tx.sign([feePayerKey, zkAppKey]);
await tx.prove();
console.log(signedTx.toPretty());
let sentTx = await signedTx.send();

if (sentTx?.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
https://berkeley.minaexplorer.com/transaction/${sentTx.hash()}
`);
}
