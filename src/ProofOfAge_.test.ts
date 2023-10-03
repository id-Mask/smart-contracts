import { proofOfAge } from './zkPrograms/ProofOfAge_';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

describe('ProofOfAge', () => {
  beforeAll(async () => {
    const { verificationKey } = await proofOfAge.compile();
    const response = await fetch(
      'https://smart-id-oracle-2qz4wkdima-uc.a.run.app/get_mock_data'
    );
    const data = await response.json();
  });

  beforeEach(async () => {
    console.log('before each');
  });

  it('verifies zkOracle response data', async () => {
    console.log('verify signature');
    // const proof = await proofOfAge.proveAge(
    //   name_,
    //   surname_,
    //   country_,
    //   pno_,
    //   signature_,
    //   age_,
    // );
  });
});
