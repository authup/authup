/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { KeyPair, KeyPairOptions } from './type';
import { extendKeyPairOptions } from './helpers';
import { loadKeyPair } from './load';
import { createKeyPair } from './create';

const keyPairCache : Record<string, KeyPair> = {};

export async function useKeyPair(value?: Partial<KeyPairOptions> | string) : Promise<KeyPair> {
    let options : KeyPairOptions;

    if (typeof value === 'string') {
        options = extendKeyPairOptions({
            privateName: value,
        });
    } else {
        options = extendKeyPairOptions(value || {});
    }

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.privateName)) {
        return keyPairCache[options.privateName];
    }

    let keyPair = await loadKeyPair(options);
    if (typeof keyPair === 'undefined') {
        keyPair = await createKeyPair(options);
    }

    keyPairCache[options.privateName] = keyPair;

    return keyPair;
}
