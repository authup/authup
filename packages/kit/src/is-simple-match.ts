/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Check if the remaining pattern can match an empty value.
 *
 * That is the case for a run of wildcards, optionally preceded by the
 * separator in front of the first one, so `https://example.com` matches
 * `https://example.com/**`.
 */
function matchesEmpty(pattern: string, index: number) : boolean {
    let i = index;

    if (pattern[i] === '/' && pattern[i + 1] === '*') {
        i++;
    }

    while (i < pattern.length) {
        if (pattern[i] !== '*') {
            return false;
        }

        if (pattern[i + 1] === '*') {
            return true;
        }

        i++;
    }

    return true;
}

/**
 * Match a value against a glob pattern, or against any pattern of a list.
 *
 * `*` matches a run of characters (the empty run included) that does not
 * cross a `/`, `**` matches the rest of the value, separators included.
 * A pattern ending in `/*` or `/**` also matches the value that stops in
 * front of that separator.
 *
 * The comparison is case sensitive, so a caller matching URLs has to
 * canonicalize the value first.
 */
export function isSimpleMatch(
    value: string,
    pattern: string | string[],
) : boolean {
    if (Array.isArray(pattern)) {
        for (const element of pattern) {
            if (isSimpleMatch(value, element)) {
                return true;
            }
        }

        return false;
    }

    if (value === pattern) {
        return true;
    }

    let valueIndex = 0;
    let patternIndex = 0;
    let globValueIndex = -1;
    let globPatternIndex = -1;

    while (valueIndex < value.length) {
        if (pattern[patternIndex] === '*') {
            if (pattern[patternIndex + 1] === '*') {
                return true;
            }

            globPatternIndex = patternIndex;
            globValueIndex = valueIndex;
            patternIndex++;

            continue;
        }

        if (pattern[patternIndex] === value[valueIndex]) {
            patternIndex++;
            valueIndex++;

            continue;
        }

        if (globPatternIndex === -1 || value[globValueIndex] === '/') {
            return false;
        }

        globValueIndex++;
        valueIndex = globValueIndex;
        patternIndex = globPatternIndex + 1;
    }

    return matchesEmpty(pattern, patternIndex);
}
