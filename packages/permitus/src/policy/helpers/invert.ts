/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type InvertFn = (input: boolean) => boolean;

export function maybeInvertPolicyOutcome(
    outcome: boolean,
    invert?: boolean | InvertFn,
) {
    if (typeof invert === 'undefined') {
        return outcome;
    }

    if (typeof invert === 'function') {
        return invert(outcome);
    }

    if (!invert) {
        return outcome;
    }

    return !outcome;
}
