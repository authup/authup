/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SymmetricAlgorithm } from './constants';
import type {
    SymmetricKeyCreateOptionsInput, SymmetricKeyImportOptions, SymmetricKeyImportOptionsInput, SymmetricKeyOptions,
} from './types';

export function normalizeSymmetricKeyCreateOptions(
    input: SymmetricKeyImportOptionsInput,
) : SymmetricKeyCreateOptionsInput {
    let optionsNormalized : SymmetricKeyOptions;
    switch (input.name) {
        case SymmetricAlgorithm.HMAC: {
            optionsNormalized = {
                hash: 'SHA-256',
                ...input,
            };
            break;
        }
        default: {
            optionsNormalized = {
                length: 256,
                ...input,
            };
        }
    }

    return optionsNormalized;
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
