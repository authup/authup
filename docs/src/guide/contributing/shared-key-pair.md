# Key Pair

The key pair API has been redesigned. Key pairs are now managed using the Web Crypto API
via the `AsymmetricKey` and `createAsymmetricKeyPair` utilities in `@authup/server-kit`.

The old `useKeyPair`, `createKeyPair`, and `deleteKeyPair` functions no longer exist.

## `createAsymmetricKeyPair`

Creates an asymmetric key pair using the Web Crypto API.

**Type**
```ts
declare function createAsymmetricKeyPair(
    options: AsymmetricKeyPairCreateOptionsInput
) : Promise<CryptoKeyPair>;
```

**Example**
```typescript
import { createAsymmetricKeyPair } from '@authup/server-kit';

(async () => {
    const keyPair = await createAsymmetricKeyPair({
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
    });

    console.log(keyPair);
    // { privateKey: CryptoKey, publicKey: CryptoKey }
})();
```

## `AsymmetricKey`

A wrapper class for `CryptoKey` that provides PEM encoding and import utilities.

```typescript
import { AsymmetricKey } from '@authup/server-kit';

// Import from base64-encoded key
const key = await AsymmetricKey.fromBase64({
    format: 'spki',
    key: base64PublicKey,
    options: {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
    },
});

// Convert to PEM
const pem = await key.toPem();
```

See `packages/server-kit/src/crypto/key/` for the full API.
