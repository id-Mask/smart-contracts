import {
  proofOfAge,
  verifyOracleData,
  parseUnixTimestampFromPNO,
} from './zkPrograms/ProofOfAge_';

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  Signature,
} from 'o1js';

import 'dotenv/config';

describe('ProofOfAge', () => {
  const zkOracleResponseMock = () => {
    const personalData = {
      name: 'Hilary',
      surname: 'Ouse',
      country: 'EE',
      pno: 'PNOLT-40111117143',
      timestamp: Math.floor(Date.now() / 1000),
    };
    const TESTING_PRIVATE_KEY: string = process.env
      .TESTING_PRIVATE_KEY as string;
    const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
    const publicKey = privateKey.toPublicKey();

    const dataToSign = [
      ...CircuitString.fromString(personalData.name).toFields(),
      ...CircuitString.fromString(personalData.surname).toFields(),
      ...CircuitString.fromString(personalData.country).toFields(),
      ...CircuitString.fromString(personalData.pno).toFields(),
      Field(personalData.timestamp),
    ];

    const signature = Signature.create(privateKey, dataToSign);

    return {
      data: personalData,
      signature: signature.toJSON(),
      publicKey: publicKey.toBase58(),
    };
  };

  beforeAll(async () => {
    const { verificationKey } = await proofOfAge.compile();
  });

  // beforeEach(async () => {
  //   console.log('before each');
  // });

  it('verifies zkOracle response data', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const verified = verifyOracleData(
      CircuitString.fromString(zkOracleResponse.data.name),
      CircuitString.fromString(zkOracleResponse.data.surname),
      CircuitString.fromString(zkOracleResponse.data.country),
      CircuitString.fromString(zkOracleResponse.data.pno),
      Field(zkOracleResponse.data.timestamp),
      Signature.fromJSON(zkOracleResponse.signature)
    );
    expect(verified.toBoolean()).toBe(true);
  });

  it('parses DoB and estimates unix timestamp', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const unixTimestamp = parseUnixTimestampFromPNO(
      CircuitString.fromString(zkOracleResponse.data.pno)
    );
    console.log(unixTimestamp);
  });

  it('produce proof', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const ageToProveInYears = 18;
    const { shouldVerify, publicOutput, proof } = await proofOfAge.proveAge(
      Field(ageToProveInYears),
      CircuitString.fromString(zkOracleResponse.data.name),
      CircuitString.fromString(zkOracleResponse.data.surname),
      CircuitString.fromString(zkOracleResponse.data.country),
      CircuitString.fromString(zkOracleResponse.data.pno),
      Field(zkOracleResponse.data.timestamp),
      Signature.fromJSON(zkOracleResponse.signature)
    );
    console.log(shouldVerify.toBoolean(), publicOutput, proof);
  });
});
