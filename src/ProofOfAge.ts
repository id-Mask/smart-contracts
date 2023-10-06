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
  SmartContract,
  State,
  state,
} from 'o1js';

import { verifyOracleData, parseUnixTimestampFromPNO } from './utils.js';

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

export class ProofOfAge extends SmartContract {
  @state(Field) num = State<Field>();

  init() {
    super.init();
    this.num.set(Field(1));
  }

  @method proveAge() {
    // proof.verify().assertTrue();
    const currentState = this.num.getAndAssertEquals();
    const newState = currentState.add(1);
    this.num.set(newState);
  }
}
