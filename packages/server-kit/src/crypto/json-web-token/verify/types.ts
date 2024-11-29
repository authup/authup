/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType } from '@authup/security';
import type { TokenECAlgorithm, TokenOCTAlgorithm, TokenRSAAlgorithm } from '../type';

export type TokenVerifyRSAOptions = {
    type: `${JWKType.RSA}` | JWKType.RSA,
    algorithms?: TokenRSAAlgorithm[],
    /**
     * base64 encoded public key.
     */
    key: string | CryptoKey,
};

export type TokenVerifyECOptions = {
    type: `${JWKType.EC}` | JWKType.EC,
    algorithms?: TokenECAlgorithm[],
    /**
     * base64 encoded public key.
     */
    key: string | CryptoKey,
};

export type TokenVerifyOCTOptions = {
    type: `${JWKType.OCT}` | JWKType.OCT,
    algorithms?: TokenOCTAlgorithm[],
    key: string | CryptoKey
};

export type TokenVerifyOptions = TokenVerifyRSAOptions | TokenVerifyECOptions | TokenVerifyOCTOptions;
