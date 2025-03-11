import 'dotenv/config';
import {
  Field,
  PrivateKey,
  Signature,
  CircuitString,
  Struct,
  createForeignCurve,
  createEcdsa,
  Crypto,
} from 'o1js';

export class Secp256r1 extends createForeignCurve(
  Crypto.CurveParams.Secp256r1
) {}
export class EcdsaP256 extends createEcdsa(Secp256r1) {}

export class PassKeysParams extends Struct({
  id: Field,
  publicKey: Secp256r1,
  payload: Secp256r1.Scalar,
  signature: EcdsaP256,
}) {}

export class PersonalData extends Struct({
  name: CircuitString,
  surname: CircuitString,
  country: CircuitString,
  pno: CircuitString,
  currentDate: Field,
  isMockData: Field,
}) {
  // method for signature creation and verification
  toFields(): Field[] {
    return [
      ...this.name.values.map((item) => item.toField()),
      ...this.surname.values.map((item) => item.toField()),
      ...this.country.values.map((item) => item.toField()),
      ...this.pno.values.map((item) => item.toField()),
      this.currentDate,
      this.isMockData,
    ];
  }
}

export const zkOracleResponseMock = () => {
  const TESTING_PRIVATE_KEY: string = process.env.TESTING_PRIVATE_KEY as string;
  const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
  const publicKey = privateKey.toPublicKey();

  const data = {
    name: 'Hilary',
    surname: 'Ouse',
    country: 'EE',
    pno: 'PNOLT-41111117143',
    currentDate: 20231024,
    isMockData: 1,
  };

  const personalData = new PersonalData({
    name: CircuitString.fromString(data.name),
    surname: CircuitString.fromString(data.surname),
    country: CircuitString.fromString(data.country),
    pno: CircuitString.fromString(data.pno),
    currentDate: Field(data.currentDate),
    isMockData: Field(data.isMockData),
  });

  const signature = Signature.create(privateKey, personalData.toFields());

  return {
    data: data,
    signature: signature.toJSON(),
    publicKey: publicKey.toBase58(),
  };
};

export const passKeysResponseMock = () => {
  return {
    id: Field(
      BigInt(
        [...'qaJp7BwUkIObDyRE5o_xNg'].map((char) => char.charCodeAt(0)).join('')
      )
    ),
    publicKey: Secp256r1.fromHex(
      '0x04f233d2c2db88ea7c936939cea21f22f1d308d3f527969f5e73ef49b47245d80c8abc0824030a31ee43dfba8419e5044f1f9e82d4e72d73b847b8ffd5f606d0a8'
    ),
    payload: Secp256r1.Scalar.from(
      '0xecaa80f4b8f73bec3100e49e601a9ffbf194d4d6b1610701aafdcc390a4ca953'
    ),
    signature: EcdsaP256.fromHex(
      '0x708330e4d634d1446cd955272c514c9a2a963e5cb1bffc5185fd404f7a6ad794274c91e52ebfa9331ce79a558ec7477a38bf43c19463fc034a022311234fa840'
    ),
  };
};

export const encodeToAsciiNumber = (str: string) => {
  return BigInt(
    str
      .split('')
      .map((char) => char.charCodeAt(0))
      .join('')
  );
};

// Convert concatenated ASCII values back to string
export const decodeFromAsciiNumber = (num: number) => {
  const strNum = num.toString();
  const result = [];
  let i = 0;

  while (i < strNum.length) {
    // Try 3-digit ASCII first (for values >= 100)
    if (i + 2 < strNum.length) {
      const asciiVal = parseInt(strNum.slice(i, i + 3));
      if (asciiVal <= 127) {
        // Valid ASCII range
        result.push(String.fromCharCode(asciiVal));
        i += 3;
        continue;
      }
    }

    // Try 2-digit ASCII
    if (i + 1 < strNum.length) {
      const asciiVal = parseInt(strNum.slice(i, i + 2));
      if (asciiVal <= 127) {
        result.push(String.fromCharCode(asciiVal));
        i += 2;
        continue;
      }
    }

    // Single digit
    const asciiVal = parseInt(strNum[i]);
    result.push(String.fromCharCode(asciiVal));
    i += 1;
  }

  return result.join('');
};

export const toPublicKeyHex = (x: number, y: number) => {
  /*
  Example usage:

  import { Crypto, createForeignCurve } from 'o1js';

  class Secp256r1 extends createForeignCurve(Crypto.CurveParams.Secp256r1) {}

  const publicKeyHex =
    '0x04f233d2c2db88ea7c936939cea21f22f1d308d3f527969f5e73ef49b47245d80c8abc0824030a31ee43dfba8419e5044f1f9e82d4e72d73b847b8ffd5f606d0a8';
  const publicKey = Secp256r1.fromHex(publicKeyHex);

  const publicKeyHex_ = toPublicKeyHex(
    publicKey.toBigint().x,
    publicKey.toBigint().y
  );

*/
  return (
    '0x04' + x.toString(16).padStart(64, '0') + y.toString(16).padStart(64, '0')
  );
};
