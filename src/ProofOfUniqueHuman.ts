import {
  Field,
  method,
  Signature,
  SmartContract,
  Permissions,
  Struct,
  ZkProgram,
  Poseidon,
  CircuitString,
  PublicKey,
} from 'o1js';

import { PersonalData } from './ProofOfAge.utils.js';

class PublicOutput extends Struct({
  hash: Field,
  currentDate: Field,
}) {}

export const proofOfUniqueHuman = ZkProgram({
  name: 'proofOfUniqueHuman',
  publicInput: undefined,
  publicOutput: PublicOutput,
  methods: {
    proveUniqueHuman: {
      privateInputs: [PersonalData, Signature, CircuitString, Signature],
      method(
        personalData: PersonalData,
        personalDataSignature: Signature,
        secretValue: CircuitString,
        secretValueSignature: Signature
      ): PublicOutput {
        const oraclePuclicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );

        // verify data inputs
        const verified = personalDataSignature.verify(
          oraclePuclicKey,
          personalData.toFields()
        );
        verified.assertTrue();

        /*
          Why use SecretValue?

          When the hash of name, surname, and personal identification number is 
          made public (e.g., hash(name, surname, pno)), it poses a privacy risk. 
          Anyone with knowledge of someone's data could potentially track them 
          down by computing the hash. To mitigate this risk, use salt value that 
          is unique to each person. This salt value is provided by the zkOracle.
          Instead of: hash(name, surname, pno), do: hash(name, surname, pno, secretvalue)

        */
        const verified_ = secretValueSignature.verify(
          oraclePuclicKey,
          secretValue.toFields()
        );
        verified_.assertTrue();

        // create hash unique to this person
        const hash = Poseidon.hash([
          ...personalData.name.toFields(),
          ...personalData.surname.toFields(),
          ...personalData.pno.toFields(),
          ...secretValue.toFields(),
        ]);

        return new PublicOutput({
          hash: hash,
          currentDate: personalData.currentDate,
        });
      },
    },
  },
});

/*
Use the zkPragram defined above to create an on-chain smart contract that
consume the proof created by the program above and thus 'put' the proof on chain
*/
export class ProofOfUniqueHumanProof extends ZkProgram.Proof(
  proofOfUniqueHuman
) {}

export class ProofOfUniqueHuman extends SmartContract {
  events = {
    'provided-valid-proof': PublicOutput,
  };
  init() {
    super.init();
    // https://docs.minaprotocol.com/zkapps/o1js/permissions#types-of-permissions
    this.account.permissions.set({
      ...Permissions.default(),
    });
  }
  @method verifyProof(proof: ProofOfUniqueHumanProof) {
    // if the proof is invalid, this will fail
    // its impossible to run past this without a valid proof
    proof.verify();

    // the above is enough to be able to check if an address has a proof
    // but there needs to be a way to save the min score that is proved
    // emit an event with min score to be able to query it via archive nodes

    // surely events are not designed for this, but it will do the trick..?
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
