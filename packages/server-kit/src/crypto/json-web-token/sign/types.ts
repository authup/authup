/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType } from '@authup/schema';
import type { KeyPair, KeyPairOptions } from '../../key-pair';
import type { TokenECAlgorithm, TokenOCTAlgorithm, TokenRSAAlgorithm } from '../type';

export type TokenSignBaseOptions = {
    keyId?: string,
};
export type TokenSignRSAOptions = TokenSignBaseOptions & {
    type: `${JWKType.RSA}` | JWKType.RSA,
    algorithm?: TokenRSAAlgorithm,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};
export type TokenSignECOptions = TokenSignBaseOptions & {
    type: `${JWKType.EC}` | JWKType.EC,
    algorithm?: TokenECAlgorithm,
    keyPair: KeyPair | Partial<KeyPairOptions> | string
};
export type TokenSignOCTOptions = TokenSignBaseOptions & {
    type: `${JWKType.OCT}` | JWKType.OCT,
    algorithm?: TokenOCTAlgorithm,
    key: string | Buffer
};

export type TokenSignOptions = TokenSignRSAOptions | TokenSignECOptions | TokenSignOCTOptions;
