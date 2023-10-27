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
  Experimental,
  SmartContract,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Provable,
  Mina,
} from 'o1js';

export const myProgram = Experimental.ZkProgram({
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

export class MyProgram extends Experimental.ZkProgram.Proof(myProgram) {}

export const otherProgram = Experimental.ZkProgram({
  publicOutput: Field,
  methods: {
    prove: {
      privateInputs: [Field],
      method(value: Field): Field {
        value.assertEquals(Field(2));
        return Field(2);
      },
    },
  },
});

export class myContract extends SmartContract {
  @method verifyProof(proof: MyProgram) {
    proof.verify();
    Provable.log(proof.publicOutput, Bool(true));
  }
}

// create proofs
await myProgram.compile();
await otherProgram.compile();

const proof = await myProgram.prove(Field(1));
const otherProof = await otherProgram.prove(Field(2));

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
const Local = Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

({ privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0]);
({ privateKey: senderKey, publicKey: senderAccount } = Local.testAccounts[1]);

zkAppPrivateKey = PrivateKey.random();
zkAppAddress = zkAppPrivateKey.toPublicKey();
zkApp = new myContract(zkAppAddress);

const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkApp.deploy();
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

console.log('use valid proof');
const txn = await Mina.transaction(senderAccount, () => {
  // AccountUpdate.fundNewAccount(senderAccount);
  zkApp.verifyProof(proof);
});
await txn.prove();
await txn.sign([senderKey]).send();

console.log('use invalid proof');
const otherTxn = await Mina.transaction(senderAccount, () => {
  // AccountUpdate.fundNewAccount(senderAccount);
  zkApp.verifyProof(otherProof);
});
await otherTxn.prove();
await otherTxn.sign([senderKey]).send();
