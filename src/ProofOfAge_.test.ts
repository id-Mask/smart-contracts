import { proofOfAge } from './zkPrograms/ProofOfAge_';
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
    const proof = await proofOfAge.verifyData(
      CircuitString.fromString(zkOracleResponse.data.name),
      CircuitString.fromString(zkOracleResponse.data.surname),
      CircuitString.fromString(zkOracleResponse.data.country),
      CircuitString.fromString(zkOracleResponse.data.pno),
      Signature.fromJSON(zkOracleResponse.signature)
    );
  });

  it('parses DoB', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const { shouldVerify, publicOutput, proof } =
      await proofOfAge.dateOfBirthTimeStamp(
        CircuitString.fromString(zkOracleResponse.data.pno)
      );
    console.log(shouldVerify.toBoolean(), publicOutput, proof);
  });
});
