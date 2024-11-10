/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType } from '@authup/kit';
import type Buffer from 'node:buffer';
import type { KeyPair, KeyPairOptions } from '../../key-pair';
import type { TokenECAlgorithm, TokenOCTAlgorithm, TokenRSAAlgorithm } from '../type';

export type TokenVerifyRSAOptions = {
    type: `${JWKType.RSA}` | JWKType.RSA,
    algorithms?: TokenRSAAlgorithm[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
};
export type TokenVerifyECOptions = {
    type: `${JWKType.EC}` | JWKType.EC,
    algorithms?: TokenECAlgorithm[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
};
export type TokenVerifyOCTOptions = {
    type: `${JWKType.OCT}` | JWKType.OCT,
    algorithms?: TokenOCTAlgorithm[],
    key: string | Buffer
};

export type TokenVerifyOptions = TokenVerifyRSAOptions | TokenVerifyECOptions | TokenVerifyOCTOptions;
