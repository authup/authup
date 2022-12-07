# Key Pair

## `useKeyPair`

The method `useKeyPair()` can be used to create a key-pair, if it does not already exist or
use an internal runtime cache, if the key was once loaded before.

**Type**
```ts
declare async function useKeyPair(value?: Partial<KeyPairOptions> | string) : Promise<KeyPair>;
```

**Example**
```typescript
import {
      useKeyPair,
      KeyPairOptions 
  } from '@authup/server-common';

const options: Partial<KeyPairOptions> = {
    /* ... */
}

(async () => {
    const keyPair = await useKeyPair(options);

    console.log(keyPair);
    // {privateKey: 'xxx', publicKey: 'xxx'}
})();
```

**Type References**
- [KeyPair](#keypair)
- [KeyPairOptions](#keypairoptions)

## `createKeyPair`

The method `createKeyPair()` can be used to create a key-pair.

**Type**
```ts
declare async function createKeyPair(
    options?: Partial<KeyPairOptions>
) : Promise<KeyPair>;
```

**Example**
```typescript
import {
    createKeyPair,
    KeyPairOptions 
} from '@authup/server-common';

const options: Partial<KeyPairOptions> = {
    /* ... */
}

(async () => {
    const keyPair = await createKeyPair(options);

    console.log(keyPair);
    // {privateKey: 'xxx', publicKey: 'xxx'}
})();
```

**References**
- [KeyPair](#keypair)
- [KeyPairOptions](#keypairoptions)

## `deleteKeyPair`

The method `deleteKeyPair()` will attempt to delete the specified key-pair on disc.

**Type**
```ts
declare async function deleteKeyPair(options?: Partial<KeyPairOptions>) : Promise<void>;
```

**Example**
```typescript
import {
    deleteKeyPair,
    KeyPairOptions 
} from '@authup/server-common';
  
const options: Partial<KeyPairOptions> = {
    /* ... */
}
  
(async () => {
    await deleteKeyPair(options);
})();
```

**References**
- [KeyPair](#keypair)
- [KeyPairOptions](#keypairoptions)

## `KeyPair`

```typescript
type KeyPair = {
    privateKey: string,
    publicKey: string
};
```

## `KeyPairOptions`
```typescript
export type KeyPairOptions = KeyPairBaseOptions & KeyPairGenerator;
```

## `KeyPairBaseOptions`
```typescript
export type KeyPairBaseOptions = {
    /**
     * Directory where to save key-pair.
     *
     * default: process.cwd()
     */
    directory: string,
    /**
     * Private key name
     *
     * default: private
     */
    privateName: string,
    /**
     * Extension for private key.
     *
     * default: pem
     */
    privateExtension: string,
    /**
     * Public key name
     *
     * default: public
     */
    publicName: string,
    /**
     * Extension for public key.
     *
     * default: pem
     */
    publicExtension: string,
    /**
     * Passphrase for private key.
     *
     * default: undefined
     */
    passphrase: string,
    /**
     * Save key-pair to file system.
     *
     * default: true
     */
    save: boolean
};
```

## `KeyPairGenerator`

```typescript
import {
    DSAKeyPairOptions,
    ECKeyPairOptions,
    RSAKeyPairOptions,
    RSAPSSKeyPairOptions,
} from 'crypto';

export type KeyPairGenerator = DSAKeyPairGenerator |
    RSAKeyPairGenerator |
    RSAPSSKeyPairGenerator |
    ECKeyPairGenerator;

export type RSAKeyPairGenerator = {
    type: 'rsa'
} & RSAKeyPairOptions<'pem', 'pem'>;

export type RSAPSSKeyPairGenerator = {
    type: 'rsa-pss',
} & RSAPSSKeyPairOptions<'pem', 'pem'>;

export type DSAKeyPairGenerator = {
    type: 'dsa'
} & DSAKeyPairOptions<'pem', 'pem'>;

export type ECKeyPairGenerator = {
    type: 'ec',
} & ECKeyPairOptions<'pem', 'pem'>;
```
