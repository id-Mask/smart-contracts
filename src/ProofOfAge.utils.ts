import 'dotenv/config';
import {
  Field,
  PrivateKey,
  Signature,
  CircuitString,
  Struct,
  Provable,
  createForeignCurve,
  createEcdsa,
  Crypto,
} from 'o1js';

class Secp256r1 extends createForeignCurve(Crypto.CurveParams.Secp256r1) {}
class EcdsaP256 extends createEcdsa(Secp256r1) {}

class PassKeysParams extends Struct({
  publicKey: Secp256r1,
  payload: Secp256r1.Scalar,
  signature: EcdsaP256,
}) {}

class PersonalData extends Struct({
  name: CircuitString,
  surname: CircuitString,
  country: CircuitString,
  pno: CircuitString,
  currentDate: Field,
}) {
  // method for signature creation and verification
  toFields(): Field[] {
    return [
      ...this.name.values.map((item) => item.toField()),
      ...this.surname.values.map((item) => item.toField()),
      ...this.country.values.map((item) => item.toField()),
      ...this.pno.values.map((item) => item.toField()),
      this.currentDate,
    ];
  }
}

/*
11 digits (https://learn.microsoft.com/en-us/purview/sit-defn-estonia-personal-identification-code):
one digit that corresponds to sex and century of birth (odd number male, even number female; 1-2: 19th century; 3-4: 20th century; 5-6: 21st century)
six digits that correspond to date of birth (YYMMDD)
three digits that correspond to a serial number separating persons born on the same date
one check digit
*/
const parseDateFromPNO = (pno: CircuitString): Field => {
  /*
    pno: CircuitString is an array of 128 Fields, where each Field represents a char
    Each char is represented in UTF-16 decimals, for example:
      • 0 === 48
      • 1 === 49
      • 2 === 50
    UTF-16 table: https://asecuritysite.com/coding/asc2
  */

  // millenium
  const firstDigit = pno.values[6].value.sub(48);
  let century = Field(18);
  century = Provable.if(
    firstDigit.greaterThanOrEqual(3),
    century.add(1),
    century
  );
  century = Provable.if(
    firstDigit.greaterThanOrEqual(5),
    century.add(1),
    century
  );

  // decade, year, month and day
  const decade = pno.values[7].value.sub(48);
  const year = pno.values[8].value.sub(48);
  const monthFirstDigit = pno.values[9].value.sub(48);
  const monthSecondDigit = pno.values[10].value.sub(48);
  const dayFirstDigit = pno.values[11].value.sub(48);
  const daySecondDigit = pno.values[12].value.sub(48);

  // express it as a single int, e.g. 20231124
  const date = century
    .mul(Field(1000000))
    .add(decade.mul(Field(100000)))
    .add(year.mul(Field(10000)))
    .add(monthFirstDigit.mul(Field(1000)))
    .add(monthSecondDigit.mul(Field(100)))
    .add(dayFirstDigit.mul(Field(10)))
    .add(daySecondDigit.mul(Field(1)));

  return date;
};

const zkOracleResponseMock = () => {
  const TESTING_PRIVATE_KEY: string = process.env.TESTING_PRIVATE_KEY as string;
  const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
  const publicKey = privateKey.toPublicKey();

  const data = {
    name: 'Hilary',
    surname: 'Ouse',
    country: 'EE',
    pno: 'PNOLT-41111117143',
    currentDate: 20231024,
  };

  const personalData = new PersonalData({
    name: CircuitString.fromString(data.name),
    surname: CircuitString.fromString(data.surname),
    country: CircuitString.fromString(data.country),
    pno: CircuitString.fromString(data.pno),
    currentDate: Field(data.currentDate),
  });

  const signature = Signature.create(privateKey, personalData.toFields());

  return {
    data: data,
    signature: signature.toJSON(),
    publicKey: publicKey.toBase58(),
  };
};

const passKeysMock = () => {
  return {
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

export {
  passKeysMock,
  PassKeysParams,
  PersonalData,
  parseDateFromPNO,
  zkOracleResponseMock,
};
