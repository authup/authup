# Key Pair

## `useKeyPair`

The method `useKeyPair()` can be used to create a key-pair, if it does not already exist or
use an internal runtime cache, if the key was once loaded before.

- **Type**
    ```ts
    async function useKeyPair(value?: KeyPairContext | string) : Promise<KeyPair>;
    ```
- **Example**
    ```typescript
    import {
          useKeyPair,
          KeyPairContext 
      } from '@authelion/api-utils';
    
    const context: KeyPairContext = {
        /* ... */
    }
    
    (async () => {
        const keyPair = await useKeyPair(context);
    
        console.log(keyPair);
        // {privateKey: 'xxx', publicKey: 'xxx'}
    })();
    ```
- **Type References**
    - [KeyPair](#keypair)
    - [KeyPairContext](#keypaircontext)

## `createKeyPair`

The method `createKeyPair()` can be used to create a key-pair.

- **Type**
    ```ts
    async function createKeyPair(context?: KeyPairContext) : Promise<KeyPair>;
    ```
- **Example**
    ```typescript
    import {
        createKeyPair,
        KeyPairContext 
    } from '@authelion/api-utils';
    
    const context: KeyPairContext = {
        /* ... */
    }
    
    (async () => {
        const keyPair = await createKeyPair(context);
    
        console.log(keyPair);
        // {privateKey: 'xxx', publicKey: 'xxx'}
    })();
    ```
- **References**
    - [KeyPair](#keypair)
    - [KeyPairContext](#keypaircontext)

## `deleteKeyPair`

The method `deleteKeyPair()` will attempt to delete the specified key-pair on disc.

- **Type**
    ```ts
    async function deleteKeyPair(context?: KeyPairContext) : Promise<void>;
    ```
- **Example**
    ```typescript
    import {
        deleteKeyPair,
        KeyPairContext 
    } from '@authelion/api-utils';
      
    const context: KeyPairContext = {
        /* ... */
    }
      
    (async () => {
        await deleteKeyPair(context);
    })();
    ```
- **References**
    - [KeyPair](#keypair)
    - [KeyPairContext](#keypaircontext)

## `KeyPair`

```typescript
type KeyPair = {
    privateKey: string,
    publicKey: string
};
```

## `KeyPairContext`
```typescript
export type KeyPairContext = {
    /**
     * Directory where to save key-pair.
     *
     * default: process.cwd()
     */
    directory?: string,
    /**
     * Private key name
     *
     * default: private
     */
    privateName?: string,
    /**
     * Extension for private key.
     *
     * default: pem
     */
    privateExtension?: string,
    /**
     * Public key name
     *
     * default: public
     */
    publicName?: string,
    /**
     * Extension for public key.
     *
     * default: pem
     */
    publicExtension?: string,
    /**
     * Passphrase for private key.
     *
     * default: undefined
     */
    passphrase?: string,
    /**
     * Save key-pair to file system.
     *
     * default: true
     */
    save?: boolean
} & KeyPairGenerator;
```

## `KeyPairGenerator`

```typescript
import {
    DSAKeyPairOptions,
    ECKeyPairOptions,
    RSAKeyPairOptions,
    RSAPSSKeyPairOptions,
} from 'crypto';

type KeyPairGenerator = DSAKeyPairGenerator |
RSAKeyPairGenerator |
RSAPSSKeyPairGenerator |
ECKeyPairGenerator;

type RSAKeyPairGenerator = {
    type?: 'rsa',
    options?: RSAKeyPairOptions<'pem', 'pem'>
};

type RSAPSSKeyPairGenerator = {
    type?: 'rsa-pss',
    options?: RSAPSSKeyPairOptions<'pem', 'pem'>
};

type DSAKeyPairGenerator = {
    type?: 'dsa',
    options?: DSAKeyPairOptions<'pem', 'pem'>
};

type ECKeyPairGenerator = {
    type?: 'ec',
    options?: ECKeyPairOptions<'pem', 'pem'>,
};
```
