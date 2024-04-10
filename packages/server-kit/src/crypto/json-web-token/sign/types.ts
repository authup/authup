/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { KeyType } from '@authup/core';
import type Buffer from 'node:buffer';
import type { KeyPair, KeyPairOptions } from '../../key-pair';
import type { TokenECAlgorithm, TokenOCTAlgorithm, TokenRSAAlgorithm } from '../type';

export type TokenSignBaseOptions = {
    keyId?: string,
};
export type TokenSignRSAOptions = TokenSignBaseOptions & {
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithm?: TokenRSAAlgorithm,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};
export type TokenSignECOptions = TokenSignBaseOptions & {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithm?: TokenECAlgorithm,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};
export type TokenSignOCTOptions = TokenSignBaseOptions & {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithm?: TokenOCTAlgorithm,
    key: string | Buffer
};

export type TokenSignOptions = TokenSignRSAOptions | TokenSignECOptions | TokenSignOCTOptions;
