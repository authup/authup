/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecodeOptions, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { KeyPairOptions } from '../key-pair';

type Context<T> = {
    options?: T
};

export type TokenSignContext = Context<SignOptions> & {
    keyPairOptions?: Partial<KeyPairOptions>
};

export type TokenVerifyContext = Context<VerifyOptions> & {
    keyPairOptions?: Partial<KeyPairOptions>
};

export type TokenDecodeContext = Context<DecodeOptions>;
