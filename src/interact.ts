import fs from 'fs/promises';
import { proofOfAge, ProofOfAge } from './ProofOfAge.js';

import {
  PersonalData,
  zkOracleResponseMock,
  PassKeysParams,
  passKeysResponseMock,
} from './proof.utils.js';

import { Field, Mina, PrivateKey, CircuitString, Signature } from 'o1js';

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
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
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
await ProofOfAge.compile();
try {
  console.log('build transaction and create proof...');

  const zkOracleResponse = zkOracleResponseMock();
  const personalData = new PersonalData({
    name: CircuitString.fromString(zkOracleResponse.data.name),
    surname: CircuitString.fromString(zkOracleResponse.data.surname),
    country: CircuitString.fromString(zkOracleResponse.data.country),
    pno: CircuitString.fromString(zkOracleResponse.data.pno),
    currentDate: Field(zkOracleResponse.data.currentDate),
    isMockData: Field(zkOracleResponse.data.isMockData),
  });

  const creatorPrivateKey = PrivateKey.random();
  const creatorPublicKey = creatorPrivateKey.toPublicKey();
  const creatorDataSignature = Signature.create(
    creatorPrivateKey,
    personalData.toFields()
  );
  const passKeysParams = new PassKeysParams(passKeysResponseMock());

  const ageToProveInYears = 18;
  const { proof } = await proofOfAge.proveAge(
    Field(ageToProveInYears),
    personalData,
    Signature.fromJSON(zkOracleResponse.signature),
    creatorDataSignature,
    creatorPublicKey,
    passKeysParams
  );

  let tx = await Mina.transaction(
    { sender: feepayerAddress, fee },
    async () => {
      zkApp.verifyProof(proof);
    }
  );
  await tx.prove();
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
