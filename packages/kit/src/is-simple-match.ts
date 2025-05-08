/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isSimpleMatch(
    value: string,
    pattern: string | string[],
) {
    if (Array.isArray(pattern)) {
        for (let i = 0; i < pattern.length; i++) {
            if (isSimpleMatch(value, pattern[i])) {
                return true;
            }
        }

        return false;
    }
    if (value === pattern) {
        return true;
    }

    const maxLength = Math.max(value.length, pattern.length);

    for (let i = 0; i < maxLength; i++) {
        if (value[i] === pattern[i]) {
            continue;
        }

        if (pattern[i] === '*') {
            if (pattern[i + 1] === '*') {
                return true;
            }

            let sI : number = -1;
            for (let j = i; j < value.length; j++) {
                if (value[j] === '/') {
                    sI = j + 1;
                    break;
                }
            }

            if (sI === -1) {
                return true;
            }

            continue;
        }

        return !value[i] &&
            pattern[i] === '/' &&
            pattern[i + 1] === '*';
    }

    return false;
}
