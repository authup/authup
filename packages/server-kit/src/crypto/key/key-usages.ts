/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getKeyUsagesForAsymmetricAlgorithm, isAsymmetricAlgorithm } from '../key-asymmetric';
import { getKeyUsagesForSymmetricAlgorithm, isSymmetricAlgorithm } from '../key-symmetric';

export function getKeyUsagesForAlgorithm(name: string, format?: Exclude<KeyFormat, 'jwk'>) : KeyUsage[] {
    if (isAsymmetricAlgorithm(name)) {
        return getKeyUsagesForAsymmetricAlgorithm(name, format);
    }

    if (isSymmetricAlgorithm(name)) {
        return getKeyUsagesForSymmetricAlgorithm(name);
    }

    throw new SyntaxError(`Key usages can not be determined for algorithm: ${name}`);
}
