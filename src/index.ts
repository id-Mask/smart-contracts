// export so that its possible to import it using the npm package

import { proofOfAge, ProofOfAge, ProofOfAgeProof } from './ProofOfAge.js';
import { PersonalData, Secp256r1, EcdsaP256, PassKeys } from './proof.utils.js';

import {
  proofOfSanctions,
  ProofOfSanctions,
  ProofOfSanctionsProof,
} from './ProofOfSanctions.js';

import {
  proofOfUniqueHuman,
  ProofOfUniqueHuman,
  ProofOfUniqueHumanProof,
} from './ProofOfUniqueHuman.js';

import {
  proofOfNationality,
  ProofOfNationality,
  ProofOfNationalityProof,
} from './ProofOfNationality.js';

export {
  PersonalData,
  Secp256r1,
  EcdsaP256,
  PassKeys,
  proofOfAge,
  ProofOfAge,
  ProofOfAgeProof,
  proofOfSanctions,
  ProofOfSanctions,
  ProofOfSanctionsProof,
  proofOfUniqueHuman,
  ProofOfUniqueHuman,
  ProofOfUniqueHumanProof,
  proofOfNationality,
  ProofOfNationality,
  ProofOfNationalityProof,
};
