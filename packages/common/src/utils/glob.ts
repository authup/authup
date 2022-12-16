/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import minimatch from 'minimatch';

export function isGlobMatch(target: string, pattern: string | string[]) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (let i = 0; i < patterns.length; i++) {
        if (minimatch(target, patterns[i])) {
            return true;
        }
    }

    return false;
}
