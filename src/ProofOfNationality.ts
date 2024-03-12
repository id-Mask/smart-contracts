import {
  Field,
  method,
  Signature,
  SmartContract,
  Permissions,
  PublicKey,
  Struct,
  ZkProgram,
} from 'o1js';

import { PersonalData } from './ProofOfAge.utils.js';
import { IntToCountryCodeAlpha2Map } from './ProofOfNationality.utils.js';

class PublicOutput extends Struct({
  nationality: [Field, Field, Field],
  currentDate: Field,
}) {}

export const proofOfNationality = ZkProgram({
  name: 'ZkProofOfNationality',
  publicInput: undefined,
  publicOutput: PublicOutput, // defined above
  methods: {
    proveNationality: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature
      ],
      method(personalData: PersonalData, signature: Signature): PublicOutput {
        // verify zkOracle data
        const oraclePuclicKey = PublicKey.fromBase58(
          'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
        );
        const validSignature = signature.verify(
          oraclePuclicKey,
          personalData.toFields()
        );
        validSignature.assertTrue();

        /*
        Nationality is expressed as an array of ints/fields 
        that are mapped to country codes: https://asecuritysite.com/coding/asc2
        */

        // TODO: use IntToCountryCodeAlpha2Map to map to single Field not an array of Fields
        const nationalityFields = personalData.country.toFields();
        while (nationalityFields.length < 3) {
          nationalityFields.push(Field(0));
        }

        return new PublicOutput({
          nationality: nationalityFields,
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
export class ProofOfNationalityProof extends ZkProgram.Proof(
  proofOfNationality
) {}

export class ProofOfNationality extends SmartContract {
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
  @method verifyProof(proof: ProofOfNationalityProof) {
    proof.verify();
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
