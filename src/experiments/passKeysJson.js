import {
  PassKeysParams,
  decodeFromAsciiNumber,
  toPublicKeyHex,
  passKeysResponseMock,
  bigintToHex,
} from '../proof.utils.js';

const passkeys = new PassKeysParams(passKeysResponseMock());

// do it manually
console.log(decodeFromAsciiNumber(passkeys.id.toBigInt().toString()));
console.log(
  toPublicKeyHex(
    passkeys.publicKey.x.toBigInt(),
    passkeys.publicKey.y.toBigInt()
  )
);
console.log('0x' + bigintToHex(passkeys.payload.toBigInt()));
console.log(
  toPublicKeyHex(
    passkeys.signature.r.toBigInt(),
    passkeys.signature.s.toBigInt()
  ).replace(/^0x04/, '0x')
);

// use the built-in fn
const params = {
  id: 'qaJp7BwUkIObDyRE5o_xNg',
  publicKey:
    '0x04f233d2c2db88ea7c936939cea21f22f1d308d3f527969f5e73ef49b47245d80c8abc0824030a31ee43dfba8419e5044f1f9e82d4e72d73b847b8ffd5f606d0a8',
  payload: '0xecaa80f4b8f73bec3100e49e601a9ffbf194d4d6b1610701aafdcc390a4ca953',
  signature:
    '0x708330e4d634d1446cd955272c514c9a2a963e5cb1bffc5185fd404f7a6ad794274c91e52ebfa9331ce79a558ec7477a38bf43c19463fc034a022311234fa840',
};
const passkeys_ = new PassKeysParams(params);
console.log(passkeys_.toJSON());
