/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoAsymmetricAlgorithm } from './constants';

export function isAsymmetricAlgorithm(input: string) : input is CryptoAsymmetricAlgorithm {
    return (Object.values(CryptoAsymmetricAlgorithm) as string[]).indexOf(input) !== -1;
}
