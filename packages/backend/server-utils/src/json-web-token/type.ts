/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecodeOptions, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { KeyPairOptions } from '../key-pair';

export type TokenBaseOptions = {
    keyPair?: Partial<KeyPairOptions>,
    secret?: string
};

export type TokenSignOptions = TokenBaseOptions & SignOptions;

export type TokenVerifyOptions = TokenBaseOptions & VerifyOptions;

export type TokenDecodeOptions = DecodeOptions;
