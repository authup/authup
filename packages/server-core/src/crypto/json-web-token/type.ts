/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DecodeOptions, Jwt, SignOptions, VerifyOptions,
} from 'jsonwebtoken';
import type Buffer from 'node:buffer';
import type { KeyType } from '@authup/core';
import type { KeyPair, KeyPairOptions } from '../key-pair';

export {
    Jwt,
};

export type TokenSignOptions = ({
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithm?: 'RS256' | 'RS384' | 'RS512' |
    'PS256' | 'PS384' | 'PS512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithm?: 'ES256' | 'ES384' | 'ES512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithm?: 'HS256' | 'HS384' | 'HS512',
    secret: string | Buffer
}) & Omit<SignOptions, 'algorithm'>;

export type TokenVerifyRSAlgorithm = 'RS256' | 'RS384' | 'RS512' |
'PS256' | 'PS384' | 'PS512';

export type TokenVerifyOptions = ({
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithms?: TokenVerifyRSAlgorithm[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithms?: ('ES256' | 'ES384' | 'ES512')[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithms?: ('HS256' | 'HS384' | 'HS512')[],
    secret: string | Buffer
}) & Omit<VerifyOptions, 'algorithms'>;

export type TokenDecodeOptions = DecodeOptions;
