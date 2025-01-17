/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType } from '@authup/protocols';
import type { TokenECAlgorithm, TokenOCTAlgorithm, TokenRSAAlgorithm } from '../type';

export type TokenSignBaseOptions = {
    keyId?: string,
};
export type TokenSignRSAOptions = TokenSignBaseOptions & {
    type: `${JWKType.RSA}` | JWKType.RSA,
    algorithm?: TokenRSAAlgorithm,
    /**
     * base64 encoded private key.
     */
    key: string | CryptoKey,
};
export type TokenSignECOptions = TokenSignBaseOptions & {
    type: `${JWKType.EC}` | JWKType.EC,
    algorithm?: TokenECAlgorithm,
    /**
     * base64 encoded private key.
     */
    key: string | CryptoKey
};

export type TokenSignOCTOptions = TokenSignBaseOptions & {
    type: `${JWKType.OCT}` | JWKType.OCT,
    algorithm?: TokenOCTAlgorithm,
    key: string | CryptoKey
};

export type TokenSignOptions = TokenSignRSAOptions | TokenSignECOptions | TokenSignOCTOptions;
