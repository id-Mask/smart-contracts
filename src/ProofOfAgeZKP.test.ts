import { proofOfAge } from './ProofOfAge';
import {
  verifyOracleData,
  parseDateFromPNO,
  zkOracleResponseMock,
} from './utils.js';

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  CircuitString,
  Signature,
  verify,
  Proof,
} from 'o1js';

describe('ProofOfAge', () => {
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
      CircuitString.fromString(zkOracleResponse.data.currentDate),
      Signature.fromJSON(zkOracleResponse.signature)
    );
    expect(verified.toBoolean()).toBe(true);
  });

  it('parses DoB', async () => {
    const zkOracleResponse = zkOracleResponseMock();
    const [dateYears, dateMonth, dateDay] = parseDateFromPNO(
      CircuitString.fromString(zkOracleResponse.data.pno)
    );
  });

  it('produce proof', async () => {
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
    console.log(`proof: ${JSON.stringify(proof.toJSON()).slice(0, 100)} ...`);
  });
});
