// Import statements from both files
import {
  proofOfUniqueHuman,
  ProofOfUniqueHuman,
  ProofOfUniqueHumanProof,
} from './ProofOfUniqueHuman.js';

import { getMockSecretValue } from './ProofOfUniqueHuman.utils.js';

import { PersonalData, zkOracleResponseMock } from './ProofOfAge.utils.js';

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Signature,
  JsonProof,
  Cache,
  CircuitString,
} from 'o1js';

describe('ProofOfUniqueHuman', () => {
  beforeAll(async () => {
    // cache
    const cache: Cache = Cache.FileSystem('./cache');
    // zkProgram that produce the proof that
    // is submitted to the on chain program
    await proofOfUniqueHuman.compile({ cache });
    // on chain smart contract that consume the
    // proof create by the zkProgram compiled above
    await ProofOfUniqueHuman.compile({ cache });
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
    /*
      No need to test Personal Data response data as this is already  
      done in proof of age. Testing secret value only
    */

    const mockSecret = getMockSecretValue();
    const secretValue = CircuitString.fromString(mockSecret.secret);
    const signature = Signature.fromJSON(mockSecret.signature);
    const validSignature = signature.verify(
      PublicKey.fromBase58(mockSecret.publicKey),
      secretValue.values.map((item) => item.toField())
    );
    expect(validSignature.toBoolean()).toBe(true);
  });

  it('zkProgram: produces proof', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const personalData = new PersonalData({
      name: CircuitString.fromString(zkOracleResponse.data.name),
      surname: CircuitString.fromString(zkOracleResponse.data.surname),
      country: CircuitString.fromString(zkOracleResponse.data.country),
      pno: CircuitString.fromString(zkOracleResponse.data.pno),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });

    const mockSecret = getMockSecretValue();
    const secretValue = CircuitString.fromString(mockSecret.secret);

    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      personalData.toFields()
    );

    const { proof } = await proofOfUniqueHuman.proveUniqueHuman(
      personalData,
      Signature.fromJSON(zkOracleResponse.signature),
      secretValue,
      Signature.fromJSON(mockSecret.signature),
      creatorDataSignature,
      creatorPublicKey
    );
    const proofJson = proof.toJSON();
    proof.verify();
    // console.log(`Unique value: ${proofJson.publicOutput[0]}`)
    expect(proofJson.publicOutput[1]).toBe('20231024');
    expect(
      PublicKey.fromFields([
        Field(proofJson.publicOutput[2]),
        Field(proofJson.publicOutput[3]),
      ]).toBase58()
    ).toBe(creatorPublicKey.toBase58());
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
    zkApp: ProofOfUniqueHuman;

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
    zkApp = new ProofOfUniqueHuman(zkAppAddress);
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

    const zkOracleResponse = zkOracleResponseMock();
    const personalData = new PersonalData({
      name: CircuitString.fromString(zkOracleResponse.data.name),
      surname: CircuitString.fromString(zkOracleResponse.data.surname),
      country: CircuitString.fromString(zkOracleResponse.data.country),
      pno: CircuitString.fromString(zkOracleResponse.data.pno),
      currentDate: Field(zkOracleResponse.data.currentDate),
    });

    const mockSecret = getMockSecretValue();
    const secretValue = CircuitString.fromString(mockSecret.secret);

    const creatorPrivateKey = PrivateKey.random();
    const creatorPublicKey = creatorPrivateKey.toPublicKey();
    const creatorDataSignature = Signature.create(
      creatorPrivateKey,
      personalData.toFields()
    );

    const { proof } = await proofOfUniqueHuman.proveUniqueHuman(
      personalData,
      Signature.fromJSON(zkOracleResponse.signature),
      secretValue,
      Signature.fromJSON(mockSecret.signature),
      creatorDataSignature,
      creatorPublicKey
    );
    const proofJson = proof.toJSON();

    // parse zkPorgram proof from JSON
    const proof_ = await ProofOfUniqueHumanProof.fromJSON(
      proofJson as JsonProof
    );

    // update transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      zkApp.verifyProof(proof_);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
