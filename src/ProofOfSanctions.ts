import {
  Field,
  method,
  Signature,
  Bool,
  SmartContract,
  Permissions,
  Struct,
  ZkProgram,
  PublicKey,
} from 'o1js';

import { PersonalData, PassKeys, Secp256r1 } from './proof.utils.js';

export class SanctionsData extends Struct({
  isMatched: Bool,
  minScore: Field,
  currentDate: Field,
}) {
  toFields(): Field[] {
    return [this.isMatched.toField(), this.minScore, this.currentDate];
  }
}

class PublicOutput extends Struct({
  minScore: Field,
  currentDate: Field,
  creatorPublicKey: PublicKey,
  passkeysPublicKey: Secp256r1,
  passkeysId: Field,
  isMockData: Field,
}) {}

export const proofOfSanctions = ZkProgram({
  name: 'ZkProofOfSanctions',
  publicInput: SanctionsData, // defined above
  publicOutput: PublicOutput, // defined above
  methods: {
    proveSanctions: {
      privateInputs: [
        PersonalData,
        Signature, // zkOracle data signature (personal data)
        Signature, // zkOracle data signature (is matched data)
        Signature, // creator wallet signature
        PublicKey, // creator wallet public key
        PassKeys, // passkeys params
      ],
      async method(
        sanctionsData: SanctionsData,
        personalData: PersonalData,
        oracleSignaturePersonalData: Signature,
        oracleSignatureSanctionsData: Signature,
        creatorSignature: Signature,
        creatorPublicKey: PublicKey,
        PassKeys: PassKeys
      ) {
        // verify zkOracle data (personal data)
        const validSignaturePersonalData = oracleSignaturePersonalData.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          personalData.toFields()
        );
        validSignaturePersonalData.assertTrue();

        // verify zkOracle data (sanctions match)
        const validSignatureSanctionsData = oracleSignatureSanctionsData.verify(
          PublicKey.fromBase58(
            'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN'
          ),
          sanctionsData.toFields()
        );
        validSignatureSanctionsData.assertTrue();

        // verify creator wallet signature
        const validSignatureWallet = creatorSignature.verify(
          creatorPublicKey,
          sanctionsData.toFields()
        );
        validSignatureWallet.assertTrue();

        // verify passkeys signature
        const validSignaturePassKeys = PassKeys.signature.verifySignedHash(
          PassKeys.payload,
          PassKeys.publicKey
        );
        validSignaturePassKeys.assertTrue();

        // assert that search agains OFAC db yielded no results
        sanctionsData.isMatched.assertFalse();

        return {
          publicOutput: {
            minScore: sanctionsData.minScore,
            currentDate: sanctionsData.currentDate,
            creatorPublicKey: creatorPublicKey,
            passkeysPublicKey: PassKeys.publicKey,
            passkeysId: PassKeys.id,
            isMockData: personalData.isMockData,
          },
        };
      },
    },
  },
});

/*
Use the zkPragram defined above to create an on-chain smart contract that
consume the proof created by the program above and thus 'put' the proof on chain
*/
export class ProofOfSanctionsProof extends ZkProgram.Proof(proofOfSanctions) {}

export class ProofOfSanctions extends SmartContract {
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
  @method async verifyProof(proof: ProofOfSanctionsProof) {
    proof.verify();
    this.emitEvent('provided-valid-proof', proof.publicOutput);
  }
}
