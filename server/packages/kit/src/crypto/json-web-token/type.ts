/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type Buffer from 'node:buffer';
import type {
    Jwt,
} from 'jsonwebtoken';
import type { JWTAlgorithm, KeyType } from '@authup/core';
import type { KeyPair, KeyPairOptions } from '../key-pair';

export {
    Jwt,
};

export type TokenSignBaseOptions = {
    keyId?: string,
};

export type TokenSignRSAOptions = TokenSignBaseOptions & {
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithm?: JWTAlgorithm.RS256 |
    JWTAlgorithm.RS384 |
    JWTAlgorithm.RS512 |
    JWTAlgorithm.PS256 |
    JWTAlgorithm.PS384 |
    JWTAlgorithm.PS512,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};

export type TokenSignECOptions = TokenSignBaseOptions & {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithm?: JWTAlgorithm.ES256 | JWTAlgorithm.ES384,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};

export type TokenSignOCTOptions = TokenSignBaseOptions & {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithm?: JWTAlgorithm.HS256 | JWTAlgorithm.HS384 | JWTAlgorithm.HS512,
    secret: string | Buffer
};

export type TokenSignOptions = TokenSignRSAOptions | TokenSignECOptions | TokenSignOCTOptions;

export type TokenVerifyOptions = {
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithms?: (
        JWTAlgorithm.RS256 |
        JWTAlgorithm.RS384 |
        JWTAlgorithm.RS512 |
        JWTAlgorithm.PS256 |
        JWTAlgorithm.PS384 |
        JWTAlgorithm.PS512
    )[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
} | {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithms?: (JWTAlgorithm.ES256 | JWTAlgorithm.ES384)[],
    keyPair: Omit<KeyPair, 'privateKey'> | KeyPair | Partial<KeyPairOptions> | string,
} | {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithms?: (JWTAlgorithm.HS256 | JWTAlgorithm.HS384 | JWTAlgorithm.HS512)[],
    secret: string | Buffer
};
