/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AsymmetricKeyImportOptionsInput } from '../key-asymmetric';
import type { SymmetricKeyImportOptionsInput } from '../key-symmetric';

export type KeyContainerSymmetricImportOptions<T> = {
    format: 'raw',
    key: T,
    options: SymmetricKeyImportOptionsInput
};

export type KeyContainerAsymmetricImportOptions<T> = {
    format: 'spki' | 'pkcs8',
    key: T,
    options: AsymmetricKeyImportOptionsInput
};

export type KeyContainerImportOptions<T> = KeyContainerAsymmetricImportOptions<T> |
KeyContainerSymmetricImportOptions<T>;
