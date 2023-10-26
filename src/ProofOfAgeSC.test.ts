import { proofOfAge, ProofOfAge, ProofOfAgeProof } from './ProofOfAge.js';
import { zkOracleResponseMock } from './utils.js';
import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  Signature,
  JsonProof,
  Proof,
} from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('ProofOfAge', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: ProofOfAge;

  beforeAll(async () => {
    // zkProgram that produce the proof that is submitted to on chain program
    await proofOfAge.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ProofOfAge(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `ProofOfAge` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(0));
  });

  it('submit proofOfAgeProof to `ProofOfAge` smart contract', async () => {
    await localDeploy();

    // create the zkProgram proof
    const zkOracleResponse = zkOracleResponseMock();
    const ageToProveInYears = 18;
    const proof = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      CircuitString.fromString(zkOracleResponse.data.name),
      CircuitString.fromString(zkOracleResponse.data.surname),
      CircuitString.fromString(zkOracleResponse.data.country),
      CircuitString.fromString(zkOracleResponse.data.pno),
      CircuitString.fromString(zkOracleResponse.data.currentDate),
      Signature.fromJSON(zkOracleResponse.signature)
    );
    const proofJson = proof.toJSON();

    // parse zkPorgram proof from JSON
    const proof_ = ProofOfAgeProof.fromJSON(proofJson as JsonProof);

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.verifyProof(proof_);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(1));
  });
});
