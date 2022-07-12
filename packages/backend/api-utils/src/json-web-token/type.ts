/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecodeOptions, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { KeyPairContext } from '../key-pair';

export type TokenBaseContext<T> = {
    options?: T,
    secret?: string
};

export type TokenSignContext = TokenBaseContext<SignOptions> & {
    keyPair?: Partial<KeyPairContext>
};

export type TokenVerifyContext = TokenBaseContext<VerifyOptions> & {
    keyPair?: Partial<KeyPairContext>
};

export type TokenDecodeContext = TokenBaseContext<DecodeOptions>;
