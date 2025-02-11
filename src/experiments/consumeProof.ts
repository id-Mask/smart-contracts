/*
I want to create a SmartContract method, that consume and verify specified proof.

Reading over other examples, I understood that this is possible by specifying the proof class in the method args
(this bakes in the program's verification key inside the smart contract's verification key), i.e.
class MyProgram extends Experimental.ZkProgram.Proof(myProgram) {}
@method verifyProof(proof: MyProgram) { proof.verify() }

But it does not seem to work in the example below. What am I doing wrong?

https://discord.com/channels/484437221055922177/1125872479030747136/1125875896302194708
https://discord.com/channels/484437221055922177/1080552939313184859/1080598740890562691
*/

import {
  Field,
  Bool,
  method,
  SmartContract,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Provable,
  Mina,
  ZkProgram,
} from 'o1js';

export const myProgram = ZkProgram({
  name: 'myProgram',
  publicOutput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      async method(value: Field) {
        value.assertEquals(Field(1));
        return { publicOutput: Field(1) };
      },
    },
  },
});

export class MyProgram extends ZkProgram.Proof(myProgram) {}

export const otherProgram = ZkProgram({
  name: 'otherProgram',
  publicOutput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      async method(value: Field) {
        value.assertEquals(Field(2));
        return { publicOutput: Field(2) };
      },
    },
  },
});

export class myContract extends SmartContract {
  @method async verifyProof(proof: MyProgram) {
    proof.verify();
    Provable.log(proof.publicOutput, Bool(true));
  }
}

// create proofs
await myProgram.compile();
await otherProgram.compile();

const { proof } = await myProgram.prove(Field(1));
const { proof: otherProof } = await otherProgram.prove(Field(2));

// use proofs inside the SmartContract
await myContract.compile();

let deployerAccount: PublicKey,
  deployerKey: PrivateKey,
  senderAccount: PublicKey,
  senderKey: PrivateKey,
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey,
  zkApp: myContract;

const proofsEnabled = true;
const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

deployerKey = Local.testAccounts[0].key;
deployerAccount = PublicKey.fromPrivateKey(deployerKey);
senderKey = Local.testAccounts[0].key;
senderAccount = PublicKey.fromPrivateKey(senderKey);

zkAppPrivateKey = PrivateKey.random();
zkAppAddress = zkAppPrivateKey.toPublicKey();
zkApp = new myContract(zkAppAddress);

const deployTxn = await Mina.transaction(deployerAccount, async () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkApp.deploy();
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

console.log('use valid proof');
const txn = await Mina.transaction(senderAccount, async () => {
  // AccountUpdate.fundNewAccount(senderAccount);
  zkApp.verifyProof(proof);
});
await txn.prove();
await txn.sign([senderKey]).send();

console.log('use invalid proof');
const otherTxn = await Mina.transaction(senderAccount, async () => {
  // AccountUpdate.fundNewAccount(senderAccount);
  zkApp.verifyProof(otherProof);
});
await otherTxn.prove();
await otherTxn.sign([senderKey]).send();
