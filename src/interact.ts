import fs from 'fs/promises';
import { proofOfAge, ProofOfAge } from './ProofOfAge.js';

import {
  PersonalData,
  personalDataResponseMock,
  PassKeys,
  passKeysResponseMock,
  CreatorAccount,
  creatorAccountResponseMock,
} from './proof.utils.js';

import { Field, Mina, PrivateKey } from 'o1js';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
Error.stackTraceLimit = 1000;

// parse config and private key from file
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
let configJson: Config = JSON.parse(
  await fs.readFile('config_devnet.json', 'utf8')
);
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new ProofOfAge(zkAppAddress);

let sentTx;
// compile the contract to create prover keys
console.log('compile the contracts...');
await proofOfAge.compile();
const { verificationKey } = await ProofOfAge.compile();
console.log(verificationKey);
try {
  console.log('build transaction and create proof...');

  const personalData_ = personalDataResponseMock();
  const personalData = new PersonalData(personalData_);

  const accountParams = creatorAccountResponseMock(personalData.toFields());
  const creatorAccountParams = new CreatorAccount(accountParams);

  const passKeysParams = new PassKeys(passKeysResponseMock());

  const ageToProveInYears = 18;
  const { proof } = await proofOfAge.proveAge(
    Field(ageToProveInYears),
    personalData,
    creatorAccountParams,
    passKeysParams
  );

  let tx = await Mina.transaction(
    { sender: feepayerAddress, fee },
    async () => {
      zkApp.verifyProof(proof);
    }
  );
  await tx.prove();
  console.log(tx.toJSON());
  console.log('send transaction...');
  sentTx = await tx.sign([feepayerKey]).send();
} catch (err) {
  console.log(err);
}
if (sentTx?.hash !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
https://minascan.io/devnet/tx/${sentTx.hash}
`);
}
