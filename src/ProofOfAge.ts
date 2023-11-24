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
  Permissions,
  PublicKey,
} from 'o1js';

import {
  PersonalData,
  parseDateFromPNO,
  parseDateFromDateString,
} from './ProofOfAge.utils.js';

export const proofOfAge = Experimental.ZkProgram({
  publicInput: Field, // ageToProveInYears
  publicOutput: Bool, // older than age to prove in years?
  methods: {
    proveAge: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature
      ],
      method(
        ageToProveInYears: Field,
        personalData: PersonalData,
        signature: Signature
      ): Bool {
        // verity zkOracle data
        const oraclePuclicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );
        const validSignature = signature.verify(
          oraclePuclicKey,
          personalData.toFields()
        );
        validSignature.assertTrue();

        const [birthYear, birthMonth, birthDay] = parseDateFromPNO(
          personalData.pno
        );
        const [currentYear, currentMonth, currentDay] = parseDateFromDateString(
          personalData.currentDate
        );

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
  events = {
    'provided-valid-proof-with-age': Field,
  };
  init() {
    super.init();
    // https://docs.minaprotocol.com/zkapps/o1js/permissions#types-of-permissions
    this.account.permissions.set({
      ...Permissions.default(),
    });
  }
  @method verifyProof(proof: ProofOfAgeProof) {
    // if the proof is invalid, this will fail
    // its impossible to run past this withought a valid proof
    proof.verify();

    // the above is enough to be able to check if an address has a proof
    // but there needs to be a way to save the number of years that are proved
    // emit an event with number of years to be able to query it via archive nodes

    // surely events are not designed for this, but it will do the trick..?
    this.emitEvent('provided-valid-proof-with-age', proof.publicInput);
  }
}
