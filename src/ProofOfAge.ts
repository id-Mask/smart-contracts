import {
  Field,
  method,
  Experimental,
  Signature,
  CircuitString,
  Bool,
  SmartContract,
  State,
  state,
  Provable,
} from 'o1js';

import {
  verifyOracleData,
  parseDateFromPNO,
  parseDateFromDateString,
} from './utils.js';

export const proofOfAge = Experimental.ZkProgram({
  publicInput: Field, // ageToProveInYears
  publicOutput: Bool, // older than age to prove in years?
  methods: {
    proveAge: {
      privateInputs: [
        CircuitString, // name
        CircuitString, // surname
        CircuitString, // country
        CircuitString, // pno
        CircuitString, // currentDate
        Signature, // zkOracle data signature
      ],
      method(
        ageToProveInYears: Field,
        name: CircuitString,
        surname: CircuitString,
        country: CircuitString,
        pno: CircuitString,
        currentDate: CircuitString,
        signature: Signature
      ): Bool {
        // verity zkOracle data
        const verified = verifyOracleData(
          name,
          surname,
          country,
          pno,
          currentDate,
          signature
        );
        verified.assertTrue();

        const [birthYear, birthMonth, birthDay] = parseDateFromPNO(pno);
        const [currentYear, currentMonth, currentDay] =
          parseDateFromDateString(currentDate);

        // edge case: https://discord.com/channels/484437221055922177/1136989663152840714
        currentYear.greaterThan(birthYear).assertTrue();

        // convert everything to days, so that it is easy to compare two numbers
        // numbers (year, month, day) will be expressed in days, e.g. 2010 = 2010 * 365
        const daysPerYear = Field(365);
        const daysPerMonth = Field(30);
        const birthDateInDays = birthYear
          .mul(daysPerYear)
          .add(birthMonth.mul(daysPerMonth))
          .add(birthDay);
        const currentDateInDays = currentYear
          .mul(daysPerYear)
          .add(currentMonth.mul(daysPerMonth))
          .add(currentDay);
        const ageToProveInDays = ageToProveInYears.mul(daysPerYear);

        // verify that (current date - age to prove) > date of birth
        const olderThanAgeToProve = currentDateInDays
          .sub(ageToProveInDays)
          .greaterThan(birthDateInDays);
        olderThanAgeToProve.assertTrue();

        return olderThanAgeToProve;
      },
    },
  },
});

/*
Use the zkPragram defined above to create an on-chain smart contract that
consume the proof created by the program above and thus 'put' the proof on chain
*/
export class ProofOfAgeProof extends Experimental.ZkProgram.Proof(proofOfAge) {}

export class ProofOfAge extends SmartContract {
  @state(Field) num = State<Field>();
  init() {
    super.init();
    this.num.set(Field(0));
  }
  @method verifyProof(proof: ProofOfAgeProof) {
    proof.verify();
    Provable.log('Provided proof is valid');
    const currentState = this.num.getAndAssertEquals();
    const newState = currentState.add(1);
    this.num.set(newState);
  }
}
