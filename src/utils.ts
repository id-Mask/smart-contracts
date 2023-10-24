import {
  Field,
  verify,
  PublicKey,
  Signature,
  CircuitString,
  Circuit,
  Bool,
} from 'o1js';

const verifyOracleData = (
  name: CircuitString,
  surname: CircuitString,
  country: CircuitString,
  pno: CircuitString,
  currentDate: CircuitString,
  signature: Signature
): Bool => {
  const PUBLIC_KEY = 'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN';
  const publicKey = PublicKey.fromBase58(PUBLIC_KEY);
  const validSignature = signature.verify(publicKey, [
    ...name.toFields(),
    ...surname.toFields(),
    ...country.toFields(),
    ...pno.toFields(),
    ...currentDate.toFields(),
  ]);
  return validSignature;
};

/*
11 digits (https://learn.microsoft.com/en-us/purview/sit-defn-estonia-personal-identification-code):
one digit that corresponds to sex and century of birth (odd number male, even number female; 1-2: 19th century; 3-4: 20th century; 5-6: 21st century)
six digits that correspond to date of birth (YYMMDD)
three digits that correspond to a serial number separating persons born on the same date
one check digit
*/
const parseDateFromPNO = (pno: CircuitString): Field[] => {
  // millenium
  const firstDigit = pno.values[6].value.sub(48);
  let century = Field(18);
  century = Circuit.if(
    firstDigit.greaterThanOrEqual(3),
    century.add(1),
    century
  );
  century = Circuit.if(
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

  // express these Fields as YYYY-MM-DD
  const dateYears = century
    .mul(Field(100))
    .add(decade.mul(Field(10)))
    .add(year);
  const dateMonth = monthFirstDigit.mul(Field(10)).add(monthSecondDigit);
  const dateDay = dayFirstDigit.mul(Field(10)).add(daySecondDigit);

  return [dateYears, dateMonth, dateDay];
};

const parseDateFromDateString = (currentDate: CircuitString): Field[] => {
  // get century, decade, year, month and day
  // from CircuitString, e.g 2023-10-25
  const millenium = currentDate.values[0].value.sub(48);
  const century = currentDate.values[1].value.sub(48);
  const decade = currentDate.values[2].value.sub(48);
  const year = currentDate.values[3].value.sub(48);
  const monthFirstDigit = currentDate.values[5].value.sub(48);
  const monthSecondDigit = currentDate.values[6].value.sub(48);
  const dayFirstDigit = currentDate.values[8].value.sub(48);
  const daySecondDigit = currentDate.values[9].value.sub(48);

  // format these Fields as if YYYY-MM-DD
  const dateYears = millenium
    .mul(Field(1000))
    .add(century.mul(Field(100)).add(decade.mul(Field(10)).add(year)));
  const dateMonth = monthFirstDigit.mul(Field(10)).add(monthSecondDigit);
  const dateDay = dayFirstDigit.mul(Field(10)).add(daySecondDigit);

  return [dateYears, dateMonth, dateDay];
};

export { verifyOracleData, parseDateFromPNO, parseDateFromDateString };
