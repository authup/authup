/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SymmetricAlgorithm } from './constants';
import type {
    SymmetricKeyCreateOptions, SymmetricKeyCreateOptionsInput, SymmetricKeyImportOptions, SymmetricKeyImportOptionsInput,
} from './types';

export function normalizeSymmetricKeyCreateOptions(
    input: SymmetricKeyCreateOptionsInput,
) : SymmetricKeyCreateOptions {
    if (input.name === SymmetricAlgorithm.HMAC) {
        return {
            hash: 'SHA-256',
            ...input,
        };
    }

    return {
        length: 256,
        name: input.name,
    };
}

export function normalizeSymmetricKeyImportOptions(
    input: SymmetricKeyImportOptionsInput,
) : SymmetricKeyImportOptions {
    if (input.name === SymmetricAlgorithm.HMAC) {
        return {
            hash: 'SHA-256',
            ...input,
        };
    }

    return input;
}
