/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTAlgorithm } from '@authup/protocols';

export type TokenRSAAlgorithm = `${JWTAlgorithm.RS256}` |
    `${JWTAlgorithm.RS384}` |
    `${JWTAlgorithm.RS512}` |
    `${JWTAlgorithm.PS256}` |
    `${JWTAlgorithm.PS384}` |
    `${JWTAlgorithm.PS512}`;

export type TokenECAlgorithm = `${JWTAlgorithm.ES256}` |
    `${JWTAlgorithm.ES384}`;

export type TokenOCTAlgorithm = `${JWTAlgorithm.HS256}` |
    `${JWTAlgorithm.HS384}` |
    `${JWTAlgorithm.HS512}`;
