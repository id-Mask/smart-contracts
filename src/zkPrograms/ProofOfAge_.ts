import {
  Field,
  method,
  Experimental,
  verify,
  PublicKey,
  Proof,
  Encoding,
  Signature,
  Provable,
  CircuitString,
  Circuit,
  Bool,
} from 'o1js';

const verifyOracleData = (
  name: CircuitString,
  surname: CircuitString,
  country: CircuitString,
  pno: CircuitString,
  timestamp: Field,
  signature: Signature
): Bool => {
  const PUBLIC_KEY = 'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN';
  const publicKey = PublicKey.fromBase58(PUBLIC_KEY);
  const validSignature = signature.verify(publicKey, [
    ...name.toFields(),
    ...surname.toFields(),
    ...country.toFields(),
    ...pno.toFields(),
    timestamp,
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
const parseUnixTimestampFromPNO = (pno: CircuitString) => {
  // first lets exctract the numbers from pno
  // then use it to calculate unix timestamp

  // millenium
  const firstDigit = pno.values[6].value.sub(48);
  let century = Field(18);
  century = Circuit.if(
    firstDigit.greaterThanOrEqual(2),
    century.add(1),
    century
  );
  century = Circuit.if(
    firstDigit.greaterThanOrEqual(4),
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

  // calculate unix timestamp
  // the result is not accurate. Its off by 13.88 days. If birth year is 2001 11 11.
  // correct: 1005433261, estimate: 1006632576, diff: 13.88096065 days
  // all this due to manual calculation instead of using proper time lib.

  const secondsPerCentury = Field(3153600000); // 100 * 365 * 24 * 60 * 60;
  const secondsPerDecade = Field(315360000); // 10 * 365 * 24 * 60 * 60;
  const secondsPerYear = Field(31536000); // 365 * 24 * 60 * 60;
  const secondsPerMonth = Field(2630016); // 30.44 * 24 * 60 * 60;
  const secondsPerDay = Field(86400); // 24 * 60 * 60;

  const secondsPerCentury_ = century.sub(19).mul(secondsPerCentury);
  const secondsPerDecade_ = decade.sub(7).mul(secondsPerDecade);
  const secondsPerYear_ = year.sub(0).mul(secondsPerYear);
  const secondsPerMonth_ = monthFirstDigit
    .sub(0)
    .mul(10)
    .add(monthSecondDigit)
    .mul(secondsPerMonth);
  const secondsPerDay_ = dayFirstDigit
    .sub(1)
    .mul(10)
    .add(daySecondDigit)
    .mul(secondsPerDay);

  const unixTimestamp = secondsPerCentury_
    .add(secondsPerDecade_)
    .add(secondsPerYear_)
    .add(secondsPerMonth_)
    .add(secondsPerDay_);

  return unixTimestamp;
};

const proofOfAge = Experimental.ZkProgram({
  publicInput: Field, // ageToProveInYears
  publicOutput: Bool, // older than age to prove in years?
  methods: {
    proveAge: {
      privateInputs: [
        CircuitString, // name
        CircuitString, // surname
        CircuitString, // country
        CircuitString, // pno
        Field, // timestamp
        Signature, // zkOracle data signature
      ],
      method(
        ageToProveInYears: Field,
        name: CircuitString,
        surname: CircuitString,
        country: CircuitString,
        pno: CircuitString,
        timestamp: Field,
        signature: Signature
      ): Bool {
        // verity zkOracle data
        const verified = verifyOracleData(
          name,
          surname,
          country,
          pno,
          timestamp,
          signature
        );
        verified.assertTrue();

        // verify that (current time - age to prove) > date of birth
        const secondsPerYear = Field(31536000); // 365 * 24 * 60 * 60;
        const dateOfBirthUnixTimestamp = parseUnixTimestampFromPNO(pno);

        // edge case: https://discord.com/channels/484437221055922177/1136989663152840714
        timestamp
          .greaterThan(ageToProveInYears.mul(secondsPerYear))
          .assertTrue();

        const olderThanAgeToProve = timestamp
          .sub(ageToProveInYears.mul(secondsPerYear))
          .greaterThan(dateOfBirthUnixTimestamp);

        olderThanAgeToProve.assertTrue();
        return olderThanAgeToProve;
      },
    },
  },
});

export { proofOfAge, verifyOracleData, parseUnixTimestampFromPNO };
