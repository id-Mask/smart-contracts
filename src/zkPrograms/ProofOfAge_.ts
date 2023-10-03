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
  methods: {
    verifyData: {
      privateInputs: [
        // the length of Encoding.stringToFields depends on type of characters
        // simple char like 'a' takes in 1/31 of field space.
        // complex chars like 'ą' takes in 1/15 of field space.
        Provable.Array(Field, 1),
        Provable.Array(Field, 1),
        Provable.Array(Field, 1),
        Provable.Array(Field, 1),
        Signature,
      ],
      method(
        name: Field[],
        surname: Field[],
        country: Field[],
        pno: Field[],
        signature: Signature
      ) {
        const publicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );
        const validSignature = signature.verify(publicKey, [
          ...name,
          ...surname,
          ...country,
          ...pno,
        ]);
        validSignature.assertTrue();
        console.log('Is signature valid? ', validSignature);
      },
    },

    parseDoB: {
      // 11 digits (https://learn.microsoft.com/en-us/purview/sit-defn-estonia-personal-identification-code):
      // one digit that corresponds to sex and century of birth (odd number male, even number female; 1-2: 19th century; 3-4: 20th century; 5-6: 21st century)
      // six digits that correspond to date of birth (YYMMDD)
      // three digits that correspond to a serial number separating persons born on the same date
      // one check digit

      privateInputs: [CircuitString],
      method(pno: CircuitString) {
        // millenium
        const firstDigit = pno.values[6].value.sub(48);
        let century = Field(18);
        century = Circuit.if(
          firstDigit.greaterThan(2),
          century.add(1),
          century
        );
        century = Circuit.if(
          firstDigit.greaterThan(4),
          century.add(1),
          century
        );

        // decade, year
        const decade = pno.values[7].value.sub(48);
        const year = pno.values[8].value.sub(48);

        // date / timestamp
        const date = century.mul(100).add(decade.mul(10).add(year));
        Provable.log(
          'century:',
          century,
          'decade:',
          decade,
          'year:',
          year,
          'date:',
          date
        );

        return date;
      },
    },
  },
});

// compile the program
const { verificationKey } = await proofOfAge.compile();

// test verifyData
const name_ = Encoding.stringToFields('Hilary');
const surname_ = Encoding.stringToFields('Ouse');
const country_ = Encoding.stringToFields('EE');
const pno_ = Encoding.stringToFields('PNOLT-40111117143');
const signature_ = Signature.fromJSON({
  r: '361140034067728913210095872454750584352705048498200155248897232741047694149',
  s: '28810745723392019298982301650715922735888542456753873104096818457809789816848',
});

await proofOfAge.verifyData(name_, surname_, country_, pno_, signature_);

// test parseDoB
const pno = CircuitString.fromString('PNOLT-39509100123');
await proofOfAge.parseDoB(pno);

export { proofOfAge };
