import { Field, MerkleMap } from 'o1js';

/*

  The idea is to express each country as a single number
  Below is the implementation of this mapping.


  Relevant sources:
  https://www.iban.com/country-codes
  https://asecuritysite.com/coding/asc2

  Example:
  str input   -   LT            Alpha-2 country code
  number[]    -   [76, 84]      Letters converted to decimal values
  number      -   7684          Decimal values concatinated
  map to num  -   7684 -> 440   Concatinated values mapped to numeric country ISO codes

*/

/*
  unicode values for uppercase letters (A-Z), e.g.
  { A: 65, B: 66, C: 67, D: 68, ... X: 88 }
*/
const letterToUnicodeMap: { [key: string]: number } = {};
for (let i = 65; i <= 90; i++) {
  const letter: string = String.fromCharCode(i);
  letterToUnicodeMap[letter] = i;
}

const countryAlpha2codeToNumericMap: { [key: string]: number } = {
  // including only the three countries available on smart-id (for now)
  LT: 440,
  LV: 428,
  EE: 233,
};

const concatUnicodeToNumericMap: { [key: number]: number } = {};
for (const country of Object.keys(countryAlpha2codeToNumericMap)) {
  /*
    mapping two letter country code to an int
    for example, mapping LT to 7684:
      L -> 76
      T -> 84
      then 76 * 100 + 84 = 7684
  */
  const [firstChar, secondChar] = country;
  const concatUnicode: number =
    letterToUnicodeMap[firstChar] * 100 + letterToUnicodeMap[secondChar];
  concatUnicodeToNumericMap[concatUnicode] =
    countryAlpha2codeToNumericMap[country];
}

const countryNumericToAlpha2codeMap: { [key: number]: string } = {};
for (const alpha2code in countryAlpha2codeToNumericMap) {
  const numericCode = countryAlpha2codeToNumericMap[alpha2code];
  countryNumericToAlpha2codeMap[numericCode] = alpha2code;
}

/*
  merkle map mapping concatUnicodes to numeric ISO codes
  for example, LT:
    Field(7684) -> Field(440)

  TODO: 
    are the key Fields limited to some number..?
    For example it should not be higher than 255..?

    Not sure if should use this or not inside the smart contract
*/
const map = new MerkleMap();
for (const concatUnicode in concatUnicodeToNumericMap) {
  map.set(
    Field(concatUnicodeToNumericMap[concatUnicode]),
    Field(concatUnicode)
  );
}

console.log(
  letterToUnicodeMap,
  countryAlpha2codeToNumericMap,
  concatUnicodeToNumericMap,
  countryNumericToAlpha2codeMap,
  map
);

export { countryNumericToAlpha2codeMap };
