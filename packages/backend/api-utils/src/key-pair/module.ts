/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { KeyPair, KeyPairContext } from './type';
import { extendKeyPairContext } from './utils';
import { loadKeyPair } from './load';
import { createKeyPair } from './create';

const keyPairCache : Record<string, KeyPair> = {};

export async function useKeyPair(value?: KeyPairContext | string) : Promise<KeyPair> {
    let context : KeyPairContext;

    if (typeof value === 'string') {
        context = extendKeyPairContext({
            privateName: value,
        });
    } else {
        context = extendKeyPairContext(value || {});
    }

    if (Object.prototype.hasOwnProperty.call(keyPairCache, context.privateName)) {
        return keyPairCache[context.privateName];
    }

    let keyPair = await loadKeyPair(context);
    if (typeof keyPair === 'undefined') {
        keyPair = await createKeyPair(context);
    }

    keyPairCache[context.privateName] = keyPair;

    return keyPair;
}
