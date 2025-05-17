import { PersonalData, zkOracleResponseMock } from '../proof.utils.js';

const data = zkOracleResponseMock();
const personalData = new PersonalData(data);
const personalDataJSON = personalData.toJSON();
const personalData_ = new PersonalData(personalDataJSON);

console.log(
  personalDataJSON,
  JSON.stringify(personalDataJSON) === JSON.stringify(personalData_.toJSON())
);
