const URL = 'https://berkeley.graphql.minaexplorer.com/';
const ZKAPPKEY = 'B62qqpAFkz374qJpuFKYZPjT1KxSmnLoY4zEc878FaW4DSxgYNXZiny';

/*
 * fetch all proofs asociated with zkAppKey
 * where feepayer is the address that created the proof
 */
const getAllProofs = async () => {
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query MyQuery {
          events(query: {
            zkAppCommandHash: {
              zkappCommand: {
                accountUpdates: {
                  body: {publicKey: "${ZKAPPKEY}"}
                },
                feePayer: {}
              }
            },
            canonical: true
          }) {
            blockHeight
            canonical
            dateTime
            event
            zkAppCommandHash {
              zkappCommand {
                feePayer {
                  body {
                    publicKey
                  }
                }
              }
            }
          }
        }
      `,
    }),
  });
  const response_ = await response.json();
  console.log(JSON.stringify(response_, null, 2));
};

/*
 * check if address has provided a proof
 * where feepayer is the address that created the proof
 */
const checkIfAddressProvidedProof = async () => {
  const address = 'B62qqE7zwMCKqkYuCVobQeAhiYp7JaifVHfizuZorD4WtkPhr4LPvoi';
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query MyQuery {
          events(query: {
            zkAppCommandHash: {
              zkappCommand: {
                accountUpdates: {
                  body: {publicKey: "${ZKAPPKEY}"}
                },
                feePayer: {
                  body: {
                    publicKey: "${address}"
                  }
                }
              }
            },
            canonical: true
          }) {
            blockHeight
            canonical
            dateTime
            event
            zkAppCommandHash {
              zkappCommand {
                feePayer {
                  body {
                    publicKey
                  }
                }
              }
            }
          }
        }
      `,
    }),
  });
  const response_ = await response.json();
  console.log(JSON.stringify(response_, null, 2));
};

// run
await getAllProofs();
await checkIfAddressProvidedProof();

export {};
