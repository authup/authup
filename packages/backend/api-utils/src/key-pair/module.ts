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

export async function useKeyPair(context: KeyPairContext) : Promise<KeyPair> {
    context = extendKeyPairContext(context);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, context.alias)) {
        return keyPairCache[context.alias];
    }

    let keyPair = await loadKeyPair(context);
    if (typeof keyPair === 'undefined') {
        keyPair = await createKeyPair(context);
    }

    keyPairCache[context.alias] = keyPair;

    return keyPair;
}
