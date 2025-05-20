// Import statements from both files
import { proofOfAge, ProofOfAge, ProofOfAgeProof } from './ProofOfAge.js';

import {
  PersonalData,
  CreatorAccount,
  PassKeys,
  personalDataResponseMock,
  creatorAccountResponseMock,
  passKeysResponseMock,
  Secp256r1,
} from './proof.utils.js';

import { parseDateFromPNO } from './ProofOfAge.utils.js';

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  JsonProof,
  Cache,
} from 'o1js';
import { Field3 } from 'o1js/dist/node/lib/provable/gadgets/foreign-field.js';

describe('ProofOfAge', () => {
  beforeAll(async () => {
    // cache
    const cache: Cache = Cache.FileSystem('./cache');
    // zkProgram that produce the proof that
    // is submitted to the on chain program
    await proofOfAge.compile({ cache });
    // on chain smart contract that consume the
    // proof create by the zkProgram compiled above
    await ProofOfAge.compile({ cache });
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
    const personalDataParams = personalDataResponseMock();
    const personalData = new PersonalData(personalDataParams);
    const validSignature = personalData.signature.verify(
      personalData.publicKey,
      personalData.toFields()
    );
    expect(validSignature.toBoolean()).toBe(true);
  });

  it('zkProgram: parses DoB', async () => {
    const personalDataParams = personalDataResponseMock();
    const dateOfBirth = parseDateFromPNO(
      CircuitString.fromString(personalDataParams.pno)
    );
    expect(dateOfBirth).toBeDefined();
  });

  it('zkProgram: produces proof', async () => {
    const ageToProveInYears = 18;
    const personalDataParams = personalDataResponseMock();
    const personalData = new PersonalData(personalDataParams);

    const creatorAccountParams = creatorAccountResponseMock(
      personalData.toFields()
    );
    const creatorAccount = new CreatorAccount(creatorAccountParams);

    const passKeysParams = passKeysResponseMock();
    const passKeys = new PassKeys(passKeysParams);

    const { proof } = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      personalData,
      creatorAccount,
      passKeys
    );

    const proofJson = proof.toJSON();

    /*
      publicOutput structure and meaning:

      [
        '18',
        '20231024',
        '14923060603108432770422887683472334907887441794372149078488906546869766018834',
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

      0     -> years to prove
      1     -> date
      2-3   -> mina wallet public key
      4-9   -> passkeys public key (x=4-6; y=7-9)
      10    -> passkeys webauthn key id parsed as int
      11    -> is personal data mocked? (1 yes, 0 no)
    */
    expect(proofJson.publicInput[0]).toBe(ageToProveInYears.toString());
    expect(proofJson.publicOutput[0]).toBe(ageToProveInYears.toString());
    expect(proofJson.publicOutput[1]).toBe('20231024');

    // mina wallet public key
    expect(
      PublicKey.fromFields([
        Field(proofJson.publicOutput[2]),
        Field(proofJson.publicOutput[3]),
      ]).toBase58()
    ).toBe(creatorAccountParams.publicKey);

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
    expect(passkeysPublicKey.x).toBe(passKeys.publicKey.toBigint().x);
    expect(passkeysPublicKey.y).toBe(passKeys.publicKey.toBigint().y);

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
    zkApp: ProofOfAge;

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
    zkApp = new ProofOfAge(zkAppAddress);
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

    // create the zkProgram proof
    const ageToProveInYears = 18;
    const personalDataParams = personalDataResponseMock();
    const personalData = new PersonalData(personalDataParams);

    const creatorAccountParams = creatorAccountResponseMock(
      personalData.toFields()
    );
    const creatorAccount = new CreatorAccount(creatorAccountParams);

    const passKeysParams = passKeysResponseMock();
    const passKeys = new PassKeys(passKeysParams);

    const { proof } = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      personalData,
      creatorAccount,
      passKeys
    );
    const proofJson = proof.toJSON();

    // parse zkPorgram proof from JSON
    const proof_ = await ProofOfAgeProof.fromJSON(proofJson as JsonProof);

    // update transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.verifyProof(proof_);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
