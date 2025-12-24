/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SymmetricAlgorithm } from './constants';

export function isSymmetricAlgorithm(input: string) : input is SymmetricAlgorithm {
    return (Object.values(SymmetricAlgorithm) as string[]).indexOf(input) !== -1;
}
