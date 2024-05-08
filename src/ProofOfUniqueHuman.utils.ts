import 'dotenv/config';
import { CircuitString, PrivateKey, Signature } from 'o1js';

const getMockSecretValue = () => {
  const TESTING_PRIVATE_KEY: string = process.env.TESTING_PRIVATE_KEY as string;
  const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
  const publicKey = privateKey.toPublicKey();

  const secret = '123abc';
  const secret_ = CircuitString.fromString('123abc');
  const signature = Signature.create(
    privateKey,
    secret_.values.map((item) => item.toField())
  );

  return {
    secret: secret,
    signature: signature.toJSON(),
    publicKey: publicKey.toBase58(),
  };
};

export { getMockSecretValue };
