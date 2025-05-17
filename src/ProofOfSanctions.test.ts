// Import statements from both files
import {
  proofOfSanctions,
  ProofOfSanctions,
  ProofOfSanctionsProof,
  SanctionsData,
} from './ProofOfSanctions.js';

import {
  PassKeysParams,
  passKeysResponseMock,
  PersonalData,
  zkOracleResponseMock,
  Secp256r1,
} from './proof.utils.js';
import { zkOracleSanctionsDataResponseMock } from './ProofOfSanctions.utils.js';

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
  CircuitString,
} from 'o1js';

import { Field3 } from 'o1js/dist/node/lib/provable/gadgets/foreign-field.js';

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
    const zkOracleResponseSanctionsData =
      zkOracleSanctionsDataResponseMock(isMatched);
    const sanctionsData = new SanctionsData({
      isMatched: Bool(zkOracleResponseSanctionsData.data.isMatched),
      minScore: Field(zkOracleResponseSanctionsData.data.minScore),
      currentDate: Field(zkOracleResponseSanctionsData.data.currentDate),
    });
    const validSignatureSanctionsData = Signature.fromJSON(
      zkOracleResponseSanctionsData.signature
    ).verify(
      PublicKey.fromBase58(
        'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
      ),
      sanctionsData.toFields()
    );
    expect(validSignatureSanctionsData.toBoolean()).toBe(true);
  });

  it('zkProgram: produces proof', async () => {
    // personal data
    const zkOraclePersonalDataResponse = zkOracleResponseMock();
    const personalData = new PersonalData(zkOraclePersonalDataResponse);

    // sanctions data
    const isMatched = false;
    const zkOracleResponseSanctionsData =
      zkOracleSanctionsDataResponseMock(isMatched);
    const sanctionsData = new SanctionsData({
      isMatched: Bool(zkOracleResponseSanctionsData.data.isMatched),
      minScore: Field(zkOracleResponseSanctionsData.data.minScore),
      currentDate: Field(zkOracleResponseSanctionsData.data.currentDate),
    });

    // mina account key pair
    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      sanctionsData.toFields()
    );

    // passkeys key pair
    const passKeysParams = new PassKeysParams(passKeysResponseMock());

    const { proof } = await proofOfSanctions.proveSanctions(
      sanctionsData,
      personalData,
      personalData.signature,
      Signature.fromJSON(zkOracleResponseSanctionsData.signature),
      creatorDataSignature,
      creatorPublicKey,
      passKeysParams
    );
    const proofJson = proof.toJSON();

    /*
      publicOutput structure and meaning:

      [
        '95',
        '20231024',
        '11544763406991407198287049458354218125756549397745563385277015494078733626067',
        '0',
        '182091471560890451648436236',
        '69884569829666403892065575',
        '1143768659744487871648617',
        '54948133397259751447253160',
        '225484032495063594216641767',
        '655155149119062222455775',
        '1139774112556611934184154393646905468295315573440512',
        '1'
      ]

      0     -> ofac match min score 
      1     -> date
      2-3   -> mina wallet public key
      4-9   -> passkeys public key (x=4-6; y=7-9)
      10    -> passkeys webauthn key id parsed as int
      11    -> is personal data mocked? (1 yes, 0 no)
    */

    expect(proofJson.publicOutput[0]).toBe(
      zkOracleResponseSanctionsData.data.minScore.toString()
    );
    expect(proofJson.publicOutput[1]).toBe(
      zkOracleResponseSanctionsData.data.currentDate.toString()
    );
    expect(
      PublicKey.fromFields([
        Field(proofJson.publicOutput[2]),
        Field(proofJson.publicOutput[3]),
      ]).toBase58()
    ).toBe(creatorPublicKey.toBase58());

    // mina wallet public key
    expect(
      PublicKey.fromFields([
        Field(proofJson.publicOutput[2]),
        Field(proofJson.publicOutput[3]),
      ]).toBase58()
    ).toBe(creatorPublicKey.toBase58());

    // passkey public key
    const passKeysX = proofJson.publicOutput
      .slice(4, 7)
      .map((i) => new Field(i)) as Field3;
    const passKeysY = proofJson.publicOutput
      .slice(7, 10)
      .map((i) => new Field(i)) as Field3;
    const passkeysPublicKey = new Secp256r1({
      x: passKeysX,
      y: passKeysY,
    }).toBigint();
    expect(passkeysPublicKey.x).toBe(passKeysParams.publicKey.toBigint().x);
    expect(passkeysPublicKey.y).toBe(passKeysParams.publicKey.toBigint().y);

    // personal data mocked flag
    expect(proofJson.publicOutput[11]).toBe('1');
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

    // personal data
    const zkOraclePersonalDataResponse = zkOracleResponseMock();
    const personalData = new PersonalData(zkOraclePersonalDataResponse);

    // sanctions data
    const isMatched = false;
    const zkOracleResponseSanctionsData =
      zkOracleSanctionsDataResponseMock(isMatched);
    const sanctionsData = new SanctionsData({
      isMatched: Bool(zkOracleResponseSanctionsData.data.isMatched),
      minScore: Field(zkOracleResponseSanctionsData.data.minScore),
      currentDate: Field(zkOracleResponseSanctionsData.data.currentDate),
    });

    // mina account key pair
    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      sanctionsData.toFields()
    );

    // passkeys key pair
    const passKeysParams = new PassKeysParams(passKeysResponseMock());

    const { proof } = await proofOfSanctions.proveSanctions(
      sanctionsData,
      personalData,
      personalData.signature,
      Signature.fromJSON(zkOracleResponseSanctionsData.signature),
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
