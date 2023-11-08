import {
  Field,
  Experimental,
  SmartContract,
  Mina,
  method,
  PublicKey,
} from 'o1js';
import { myProgram, ProofOfMyProgram, MyContract } from './exampleProgram.js';

export const putProofOnChain = async (
  proofJson,
  ProofJson,
  SmartContractProgram,
  zkAppAddress
) => {
  // compile and save proof as JSON
  await SmartContractProgram.compile();

  // json -> proof
  proof = ProofJson.fromJSON(proofJson);
  console.log('proof', proof);

  // create transaction
  const fee = 0.1 * 1e9;
  const zkAppAddress_ = PublicKey.fromBase58(zkAppAddress);

  try {
    const tx = await Mina.transaction(() => {
      let zkApp = new SmartContractProgram(zkAppAddress_);
      zkApp.verifyProof(proof);
      console.log('this is where the error hits');
    });

    await tx.prove();
    console.log(tx.toJSON());
  } catch (error) {
    console.log(error);
  }
};

// create proof
await myProgram.compile();
let proof = await myProgram.method(Field(0));
const proofJson = proof.toJSON();
console.log('proof', proof);

await putProofOnChain(
  proofJson,
  ProofOfMyProgram,
  MyContract,
  'B62qqpAFkz374qJpuFKYZPjT1KxSmnLoY4zEc878FaW4DSxgYNXZiny'
);
