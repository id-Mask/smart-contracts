// Import statements from both files
import {
  proofOfSanctions,
  ProofOfSanctions,
  ProofOfSanctionsProof,
  PublicInput,
} from './ProofOfSanctions.js';

import { PassKeysParams, passKeysResponseMock } from './proof.utils.js';

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
  Signature,
  JsonProof,
  Bool,
  Cache,
} from 'o1js';

describe('ProofOfSanctions', () => {
  beforeAll(async () => {
    // cache
    const cache: Cache = Cache.FileSystem('./cache');
    // zkProgram that produce the proof that
    // is submitted to the on chain program
    await proofOfSanctions.compile({ cache });
    // on chain smart contract that consume the
    // proof create by the zkProgram compiled above
    await ProofOfSanctions.compile({ cache });
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
      Field(zkOracleResponse.data.currentDate),
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
      currentDate: Field(zkOracleResponse.data.currentDate),
    });

    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      publicInput.toFields()
    );
    const passKeysParams = new PassKeysParams(passKeysResponseMock());

    const { proof } = await proofOfSanctions.proveSanctions(
      publicInput,
      Signature.fromJSON(zkOracleResponse.signature),
      creatorDataSignature,
      creatorPublicKey,
      passKeysParams
    );
    const proofJson = proof.toJSON();
    expect(proofJson.publicOutput[0]).toBe(
      zkOracleResponse.data.minScore.toString()
    );
    expect(proofJson.publicOutput[1]).toBe(
      zkOracleResponse.data.currentDate.toString()
    );
    expect(
      PublicKey.fromFields([
        Field(proofJson.publicOutput[2]),
        Field(proofJson.publicOutput[3]),
      ]).toBase58()
    ).toBe(creatorPublicKey.toBase58());
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
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    deployerKey = Local.testAccounts[0].key;
    deployerAccount = PublicKey.fromPrivateKey(deployerKey);
    senderKey = Local.testAccounts[0].key;
    senderAccount = PublicKey.fromPrivateKey(senderKey);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    // deploy smart contract
    zkApp = new ProofOfSanctions(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('smart contract: generates and deploys', async () => {
    await localDeploy();
  });

  it('smart contract: consumes the proof and runs method', async () => {
    await localDeploy();

    const isMatched = false;
    const zkOracleResponse = zkOracleResponseMock(isMatched);
    const publicInput = new PublicInput({
      isMatched: Bool(zkOracleResponse.data.isMatched),
      minScore: Field(zkOracleResponse.data.minScore),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });

    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      publicInput.toFields()
    );
    const passKeysParams = new PassKeysParams(passKeysResponseMock());

    const { proof } = await proofOfSanctions.proveSanctions(
      publicInput,
      Signature.fromJSON(zkOracleResponse.signature),
      creatorDataSignature,
      creatorPublicKey,
      passKeysParams
    );
    const proofJson = proof.toJSON();

    // parse zkPorgram proof from JSON
    const proof_ = await ProofOfSanctionsProof.fromJSON(proofJson as JsonProof);

    // update transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.verifyProof(proof_);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
