/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AsymmetricKeyImportOptionsInput } from '../key-asymmetric';
import type { SymmetricKeyImportOptionsInput } from '../key-symmetric';

export type KeyContainerFromOptions<
    T extends Exclude<KeyFormat, 'jwk'>,
> = T extends 'spki' | 'pkcs8' ?
    AsymmetricKeyImportOptionsInput :
    T extends 'raw' ?
        SymmetricKeyImportOptionsInput :
        never;

export type KeyContainerImportContext = {};
