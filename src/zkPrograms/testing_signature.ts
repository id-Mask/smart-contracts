import {
  Field,
  method,
  Experimental,
  verify,
  PublicKey,
  Encoding,
  Signature,
  PrivateKey,
} from 'o1js';
import 'dotenv/config';

// data
const data = {
  name: 'Hilary',
  surname: 'Ouse',
  country: 'EE',
  pno: 'PNOLT-40111117143',
};

// create signature
const TESTING_PRIVATE_KEY: string = process.env.TESTING_PRIVATE_KEY as string;
const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
const publicKey = privateKey.toPublicKey();

// encode and sign the data
const merged_array_of_fields = [
  ...Encoding.stringToFields(data.name),
  ...Encoding.stringToFields(data.surname),
  ...Encoding.stringToFields(data.country),
  ...Encoding.stringToFields(data.pno),
];
const signature = Signature.create(privateKey, merged_array_of_fields);
console.log('signature: ', signature);

// verify signature
const name_ = Encoding.stringToFields('Hilary');
const surname_ = Encoding.stringToFields('Ouse');
const country_ = Encoding.stringToFields('EE');
const pno_ = Encoding.stringToFields('PNOLT-40111117143');
console.log(signature.toJSON());
const signature_ = Signature.fromJSON(signature.toJSON());
const publicKey_ = PublicKey.fromBase58(publicKey.toBase58());

const validSignature = signature_.verify(publicKey_, [
  ...name_,
  ...surname_,
  ...country_,
  ...pno_,
]);
console.log(validSignature);
console.log(validSignature.toBoolean());
console.log(name_[0].toJSON());
