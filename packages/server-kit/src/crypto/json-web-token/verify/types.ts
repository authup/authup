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

export type TokenVerifyRSAOptions = {
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithms?: TokenRSAAlgorithm[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
};
export type TokenVerifyECOptions = {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithms?: TokenECAlgorithm[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
};
export type TokenVerifyOCTOptions = {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithms?: TokenOCTAlgorithm[],
    key: string | Buffer
};

export type TokenVerifyOptions = TokenVerifyRSAOptions | TokenVerifyECOptions | TokenVerifyOCTOptions;
