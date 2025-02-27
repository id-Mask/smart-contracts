import 'dotenv/config';
import { Field, CircuitString, Provable } from 'o1js';

/*
11 digits (https://learn.microsoft.com/en-us/purview/sit-defn-estonia-personal-identification-code):
one digit that corresponds to sex and century of birth (odd number male, even number female; 1-2: 19th century; 3-4: 20th century; 5-6: 21st century)
six digits that correspond to date of birth (YYMMDD)
three digits that correspond to a serial number separating persons born on the same date
one check digit
*/
export const parseDateFromPNO = (pno: CircuitString): Field => {
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
