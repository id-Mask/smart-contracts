import {
  Field,
  method,
  Experimental,
  verify,
  PublicKey,
  Encoding,
  Signature,
  Provable,
  CircuitString,
  Circuit,
} from 'o1js';

const proofOfAge = Experimental.ZkProgram({
  publicOutput: Field,
  methods: {
    verifyData: {
      privateInputs: [
        CircuitString,
        CircuitString,
        CircuitString,
        CircuitString,
        Signature,
      ],
      method(
        name: CircuitString,
        surname: CircuitString,
        country: CircuitString,
        pno: CircuitString,
        signature: Signature
      ): Field {
        const PUBLIC_KEY =
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN';
        const publicKey = PublicKey.fromBase58(PUBLIC_KEY);
        const validSignature = signature.verify(publicKey, [
          ...name.toFields(),
          ...surname.toFields(),
          ...country.toFields(),
          ...pno.toFields(),
        ]);
        validSignature.assertTrue();
        return validSignature.toField();
      },
    },

    parseDoB: {
      // 11 digits (https://learn.microsoft.com/en-us/purview/sit-defn-estonia-personal-identification-code):
      // one digit that corresponds to sex and century of birth (odd number male, even number female; 1-2: 19th century; 3-4: 20th century; 5-6: 21st century)
      // six digits that correspond to date of birth (YYMMDD)
      // three digits that correspond to a serial number separating persons born on the same date
      // one check digit

      privateInputs: [CircuitString],
      method(pno: CircuitString): Field {
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

        // decade, year
        const decade = pno.values[7].value.sub(48);
        const year = pno.values[8].value.sub(48);

        // date / timestamp
        const date = century.mul(100).add(decade.mul(10).add(year));
        return date;
      },
    },
  },
});

export { proofOfAge };
