/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { EVENT_DIFF_SECRET_KEY_REGEX } from './diff.ts';

/**
 * The central PII/credential write boundary for event context data.
 *
 * Allowlist-first: only these keys survive, and only with scalar values —
 * objects and arrays are dropped outright, so a nested structure can never
 * smuggle a secret past the boundary (this subsumes a denylist: password,
 * client_secret, code, code_verifier, *token* etc. are simply never listed).
 * jti is an opaque correlation id, not PII (a session id is not listed here:
 * it rides the dedicated `sessionId` column, never the data bag).
 * name / use / status / enabled / force describe key & trust-anchor lifecycle
 * operations (issue #3269) — canonical identifiers and enum/flag metadata,
 * never material. kind is the MFA authenticator kind (totp/email/...).
 *
 * The single structured exception is `diff` (entity-CRUD bridge): it survives
 * only as a one-level object of `{ next, previous }` scalar pairs, keys
 * re-checked against the diff secret denylist — the write boundary stays the
 * choke point even though buildEntityDiff pre-sanitizes.
 */
const DATA_KEY_ALLOW_LIST = [
    'grantType',
    'scope',
    'responseType',
    'prompt',
    'error',
    'errorCode',
    'reason',
    'clientName',
    'realmName',
    'jti',
    'name',
    'use',
    'status',
    'enabled',
    'force',
    'kind',
] as const;

const DATA_VALUE_MAX_LENGTH = 512;

function isDiffScalar(value: unknown): value is string | number | boolean | null {
    return value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean';
}

function truncateDiffScalar(
    value: string | number | boolean | null,
): string | number | boolean | null {
    if (typeof value === 'string' && value.length > DATA_VALUE_MAX_LENGTH) {
        return value.substring(0, DATA_VALUE_MAX_LENGTH);
    }

    return value;
}

function sanitizeDiff(input: unknown): Record<string, any> | null {
    if (!isObject(input)) {
        return null;
    }

    const output: Record<string, any> = {};

    for (const [key, entry] of Object.entries(input)) {
        if (EVENT_DIFF_SECRET_KEY_REGEX.test(key)) {
            continue;
        }

        if (!isObject(entry)) {
            continue;
        }

        const { next, previous } = entry;
        if (!isDiffScalar(next) || !isDiffScalar(previous)) {
            continue;
        }

        output[key] = {
            next: truncateDiffScalar(next),
            previous: truncateDiffScalar(previous),
        };
    }

    if (Object.keys(output).length === 0) {
        return null;
    }

    return output;
}

export function sanitizeEventData(
    input?: Record<string, any> | null,
): Record<string, any> | null {
    if (!input) {
        return null;
    }

    const output: Record<string, any> = {};

    for (const key of DATA_KEY_ALLOW_LIST) {
        const value = input[key];

        if (typeof value === 'string') {
            output[key] = value.length > DATA_VALUE_MAX_LENGTH ?
                value.substring(0, DATA_VALUE_MAX_LENGTH) :
                value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            output[key] = value;
        }
    }

    const diff = sanitizeDiff(input.diff);
    if (diff) {
        output.diff = diff;
    }

    if (Object.keys(output).length === 0) {
        return null;
    }

    return output;
}
