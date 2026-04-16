/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function serializeOAuth2Scope(scope: string[]) {
    return scope.join(' ');
}

/**
 * Deserialize a string representation of multiple oauth2 scopes.
 *
 * @param scope
 */
export function deserializeOAuth2Scope(scope: string) : string[] {
    return scope.split(/\s+|,+/)
        .map((el) => el.toLowerCase());
}

export function unwrapOAuth2Scope(input: string | string[]) : string[] {
    if (Array.isArray(input)) {
        return input
            .flatMap((el) => unwrapOAuth2Scope(el));
    }

    return deserializeOAuth2Scope(input);
}

/**
 * Check if granted scope(s) cover required scop(e).
 *
 * @param granted
 * @param required
 */
export function hasOAuth2Scopes(
    granted: string | string[] = [],
    required: string | string[] = [],
) : boolean {
    const grantedNormalized = unwrapOAuth2Scope(granted);
    if (grantedNormalized.length === 0) {
        return false;
    }

    const requiredNormalized = unwrapOAuth2Scope(required);
    if (requiredNormalized.length === 0) {
        return true;
    }

    return requiredNormalized.every((el) => grantedNormalized.includes(el));
}
