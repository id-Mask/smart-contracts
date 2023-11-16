// Import statements from both files
import {
  proofOfSanctions,
  ProofOfSanctions,
  ProofOfSanctionsProof,
  PublicInput,
} from './ProofOfSanctions.js';

import {
  zkOracleResponseMock,
  verifyOracleData,
} from './ProofOfSanctions.utils.js';

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  Signature,
  JsonProof,
  Bool,
} from 'o1js';

describe('ProofOfSanctions', () => {
  beforeAll(async () => {
    // zkProgram that produce the proof that
    // is submitted to the on chain program
    await proofOfSanctions.compile();
    // on chain smart contract that consume the
    // proof create by the zkProgram compiled above
    await ProofOfSanctions.compile();
  });

  // beforeEach(() => {});

  /*
    Part 1

    Testing the zkProgram that produces the main proof.
    This proof might be submitted to the other zk program
    That sits on chain and consumes the proof created by
    this zkProgram.
  */
  it('zkProgram: verifies zkOracle response data', async () => {
    const isMatched = false;
    const zkOracleResponse = zkOracleResponseMock(isMatched);
    const verified = verifyOracleData(
      Bool(zkOracleResponse.data.isMatched),
      Field(zkOracleResponse.data.minScore),
      CircuitString.fromString(zkOracleResponse.data.currentDate),
      Signature.fromJSON(zkOracleResponse.signature)
    );
    expect(verified.toBoolean()).toBe(true);
  });

  it('zkProgram: produces proof', async () => {
    const isMatched = false;
    const zkOracleResponse = zkOracleResponseMock(isMatched);
    const publicInput = new PublicInput({
      isMatched: Bool(zkOracleResponse.data.isMatched),
      minScore: Field(zkOracleResponse.data.minScore),
      currentDate: CircuitString.fromString(zkOracleResponse.data.currentDate),
    });
    const proof = await proofOfSanctions.proveSanctions(
      publicInput,
      Signature.fromJSON(zkOracleResponse.signature)
    );
    const proofJson = proof.toJSON();
    // console.log(JSON.stringify(proofJson, null, 2));
    expect(proofJson.publicOutput[0]).toBe(
      zkOracleResponse.data.minScore.toString()
    );
    // console.log(`proof: ${JSON.stringify(proof.toJSON()).slice(0, 100)} ...`);
  });

  /*
    Part 2

    Testing the on chain smart contract that consumes the main proof.
    Upon consuming the proof it will tie the senders address
    with the fact that it has a valid proof.
  */

  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: ProofOfSanctions;

  async function localDeploy() {
    // setup local blockchain
    const proofsEnabled = true;
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    // deploy smart contract
    zkApp = new ProofOfSanctions(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('smart contract: generates and deploys', async () => {
    await localDeploy();
    // const num = zkApp.num.get();
    // expect(num).toEqual(Field(0));
  });

  it('smart contract: consumes the proof and runs method', async () => {
    await localDeploy();

    const isMatched = false;
    const zkOracleResponse = zkOracleResponseMock(isMatched);
    const publicInput = new PublicInput({
      isMatched: Bool(zkOracleResponse.data.isMatched),
      minScore: Field(zkOracleResponse.data.minScore),
      currentDate: CircuitString.fromString(zkOracleResponse.data.currentDate),
    });
    const proof = await proofOfSanctions.proveSanctions(
      publicInput,
      Signature.fromJSON(zkOracleResponse.signature)
    );
    const proofJson = proof.toJSON();

    // parse zkPorgram proof from JSON
    const proof_ = ProofOfSanctionsProof.fromJSON(proofJson as JsonProof);

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.verifyProof(proof_);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    // const updatedNum = zkApp.num.get();
    // expect(updatedNum).toEqual(Field(1));
  });
});
