import 'dotenv/config';
import {
  Field,
  PublicKey,
  PrivateKey,
  Signature,
  CircuitString,
  Circuit,
  Bool,
} from 'o1js';

const verifyOracleData = (
  isMatched: Bool,
  minScore: Field,
  currentDate: CircuitString,
  signature: Signature
): Bool => {
  const PUBLIC_KEY = 'B62qmXFNvz2sfYZDuHaY5htPGkx1u2E2Hn3rWuDWkE11mxRmpijYzWN';
  const publicKey = PublicKey.fromBase58(PUBLIC_KEY);
  const validSignature = signature.verify(publicKey, [
    isMatched.toField(),
    minScore,
    ...currentDate.toFields(),
  ]);
  return validSignature;
};

const zkOracleResponseMock = (isMatched: boolean) => {
  const data = {
    isMatched: isMatched,
    minScore: 95,
    currentDate: '2023-11-16',
  };
  const TESTING_PRIVATE_KEY: string = process.env.TESTING_PRIVATE_KEY as string;
  const privateKey = PrivateKey.fromBase58(TESTING_PRIVATE_KEY);
  const publicKey = privateKey.toPublicKey();

  const dataToSign = [
    Bool(data.isMatched).toField(),
    Field(data.minScore),
    ...CircuitString.fromString(data.currentDate).toFields(),
  ];

  const signature = Signature.create(privateKey, dataToSign);

  return {
    data: data,
    signature: signature.toJSON(),
    publicKey: publicKey.toBase58(),
  };
};

export { verifyOracleData, zkOracleResponseMock };
