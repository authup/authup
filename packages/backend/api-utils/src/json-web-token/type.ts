/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecodeOptions, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { KeyPairContext } from '../key-pair';

type Context<T> = {
    options?: T,
    secret?: string
};

export type TokenSignContext = Context<SignOptions> & {
    keyPair?: Partial<KeyPairContext>
};

export type TokenVerifyContext = Context<VerifyOptions> & {
    keyPair?: Partial<KeyPairContext>,
};

export type TokenDecodeContext = Context<DecodeOptions>;
