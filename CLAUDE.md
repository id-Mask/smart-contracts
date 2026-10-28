# smart-contracts

o1js ZkPrograms and Mina SmartContracts for ID-Mask. This repo is the **source of truth** for the circuits. It's published as the npm package `idmask-zk-programs` (entry `build/src/index.js`). See `../CLAUDE.md` for how it fits with the other repos.

## Commands

```sh
npm run build        # tsc -> build/
npm test             # jest (ESM via --experimental-vm-modules); slow, compiles circuits
npx jest src/ProofOfAge.test.ts    # (with NODE_OPTIONS=--experimental-vm-modules) single file
npm run lint         # eslint src/* --fix (includes eslint-plugin-o1js)
npm run format       # prettier
node build/src/deploy.js <alias>    # alias from config.json (mainnet) / config_devnet.json
node build/src/interact.js <alias>
```

Tests have a 1,000,000 ms timeout because circuit compilation is slow. A husky pre-commit hook runs lint-staged (eslint + prettier).

## Structure

Each proof type follows the same four-file pattern in `src/`:

- `ProofOfX.ts`: `PublicOutput` Struct, `proofOfX` ZkProgram (method `proveX`), `ProofOfXProof`, and the `ProofOfX` SmartContract. The contract's `verifyProof` verifies the proof and emits a `provided-valid-proof` event.
- `ProofOfX.utils.ts`: circuit helpers. For example, `parseDateFromPNO` extracts the date of birth from an Estonian-style personal code stored as a `CircuitString`.
- `ProofOfX.test.ts`: Jest tests.
- `proof.utils.ts`: shared Structs (`PersonalData`, `CreatorAccount`, `PassKeys`, `Secp256r1`, `EcdsaP256`) and mock responses (`*ResponseMock`) used by tests.

The proof types are Age, Sanctions, UniqueHuman, and Nationality. `index.ts` re-exports everything for the npm package. `src/experiments/` holds scratch scripts that aren't part of the package.

## Circuit conventions

Every `proveX` method:
1. Verifies the zk-oracle signature over `personalData.toFields()` with the hardcoded oracle key `B62qmXFN...YzWN`.
2. Verifies the `CreatorAccount` Mina signature. This is legacy and may be deprecated.
3. Verifies the passkeys ECDSA-P256 signature (`verifySignedHash`), which binds the proof to the user.
4. Asserts the fact being proven and returns `publicOutput` with the passkey public key, the passkey id, and `isMockData`.

Comments reference audit findings (for example "audit's finding 3.3"). Keep those assertions.

## Gotchas

- The code uses ESM with `.js` extensions in TS imports (`from './proof.utils.js'`). Jest maps these back.
- Deploy with `deploy.ts`, not the zkapp CLI. The contract depends on a ZkProgram, so it has to be compiled first; `deploy.ts` uses a `Cache.FileSystem('./cache')`.
- After any circuit change, copy the compiled `build/src/*.js` into `../website/src/components/zkPrograms/` and regenerate the verification-key cache the website downloads. The files `deploy.js` writes to `./cache` are uploaded by hand to `gs://id-mask-config/cache_v2/<proofName>/` (see root CLAUDE.md).
- `keys/`, `cache/`, `build/`, and `.env` are gitignored. Never commit keys.
