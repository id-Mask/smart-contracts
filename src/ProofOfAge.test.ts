// Import statements from both files
import { proofOfAge, ProofOfAge, ProofOfAgeProof } from './ProofOfAge.js';
import {
  PersonalData,
  zkOracleResponseMock,
  parseDateFromPNO,
  // verifyOracleData,
} from './ProofOfAge.utils.js';
import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  Signature,
  JsonProof,
  Cache,
} from 'o1js';

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
    const zkOracleResponse = zkOracleResponseMock();
    const personalData = new PersonalData({
      name: CircuitString.fromString(zkOracleResponse.data.name),
      surname: CircuitString.fromString(zkOracleResponse.data.surname),
      country: CircuitString.fromString(zkOracleResponse.data.country),
      pno: CircuitString.fromString(zkOracleResponse.data.pno),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });
    const signature = Signature.fromJSON(zkOracleResponse.signature);
    const validSignature = signature.verify(
      PublicKey.fromBase58(zkOracleResponse.publicKey),
      personalData.toFields()
    );
    expect(validSignature.toBoolean()).toBe(true);
  });

  it('zkProgram: parses DoB', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const dateOfBirth = parseDateFromPNO(
      CircuitString.fromString(zkOracleResponse.data.pno)
    );
    expect(dateOfBirth).toBeDefined();
  });

  it('zkProgram: produces proof', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const ageToProveInYears = 18;
    const personalData = new PersonalData({
      name: CircuitString.fromString(zkOracleResponse.data.name),
      surname: CircuitString.fromString(zkOracleResponse.data.surname),
      country: CircuitString.fromString(zkOracleResponse.data.country),
      pno: CircuitString.fromString(zkOracleResponse.data.pno),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });
    const proof = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      personalData,
      Signature.fromJSON(zkOracleResponse.signature)
    );
    const proofJson = proof.toJSON();
    expect(proofJson.publicInput[0]).toBe(ageToProveInYears.toString());
    expect(proofJson.publicOutput[0]).toBe('1');
    expect(proofJson.publicOutput[1]).toBe('20231024');
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
    zkApp: ProofOfAge;

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
    zkApp = new ProofOfAge(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, () => {
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
    const zkOracleResponse = zkOracleResponseMock();
    const ageToProveInYears = 18;
    const personalData = new PersonalData({
      name: CircuitString.fromString(zkOracleResponse.data.name),
      surname: CircuitString.fromString(zkOracleResponse.data.surname),
      country: CircuitString.fromString(zkOracleResponse.data.country),
      pno: CircuitString.fromString(zkOracleResponse.data.pno),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });
    const proof = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      personalData,
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

    // const updatedNum = zkApp.num.get();
    // expect(updatedNum).toEqual(Field(1));
  });
});
