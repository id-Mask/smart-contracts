import { PersonalData, personalDataResponseMock } from '../proof.utils.js';

const data = personalDataResponseMock();
const personalData = new PersonalData(data);
const personalDataJSON = personalData.toJSON();
const personalData_ = new PersonalData(personalDataJSON);

console.log(
  personalDataJSON,
  JSON.stringify(personalDataJSON) === JSON.stringify(personalData_.toJSON())
);
