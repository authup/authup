/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@ebec/core';

/**
 * The property key under which an instance's `@instanceof` chain is stored.
 *
 * The chain is an array of `Symbol.for(...)` markers, one per class in the
 * inheritance hierarchy. Each class appends its own marker via
 * `markInstanceof(this, MARKER)` from its constructor. Subclass instances
 * accumulate markers from every ancestor in the chain, so a parent-class
 * guard can fast-path-match a subclass instance.
 *
 * Example:
 *   OAuth2GrantError extends OAuth2Error extends AuthupError
 *   instance.@instanceof === [AUTHUP_ERROR, OAUTH2_ERROR, OAUTH2_GRANT_ERROR]
 *   isOAuth2Error(instance)       // fast-path-matches via OAUTH2_ERROR
 *   isOAuth2GrantError(instance)  // fast-path-matches via OAUTH2_GRANT_ERROR
 */
export const INSTANCEOF_PROPERTY = '@instanceof';

/**
 * Append a class-marker symbol to the receiver's `@instanceof` chain.
 * Idempotent — re-marking the same instance with the same symbol is a no-op.
 *
 * Call this from each error class's constructor:
 * ```ts
 * constructor(input?) {
 *     super(input);
 *     markInstanceof(this, MY_ERROR_INSTANCE);
 * }
 * ```
 */
export function markInstanceof(target: object, marker: symbol): void {
    const existing = (target as Record<string, unknown>)[INSTANCEOF_PROPERTY];
    if (Array.isArray(existing)) {
        if (!existing.includes(marker)) {
            existing.push(marker);
        }
        return;
    }
    Object.defineProperty(target, INSTANCEOF_PROPERTY, {
        value: [marker],
        writable: false,
        enumerable: false,
        configurable: false,
    });
}

/**
 * Check whether the input's `@instanceof` chain contains `marker`.
 * Returns `false` for non-objects or instances without the chain.
 */
export function hasInstanceof(input: unknown, marker: symbol): boolean {
    if (!isObject(input)) {
        return false;
    }

    const chain = input[INSTANCEOF_PROPERTY];
    return Array.isArray(chain) && chain.includes(marker);
}
