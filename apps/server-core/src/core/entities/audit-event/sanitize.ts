/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The central PII/credential write boundary for audit-event context data.
 *
 * Allowlist-first: only these keys survive, and only with scalar values —
 * objects and arrays are dropped outright, so a nested structure can never
 * smuggle a secret past the boundary (this subsumes a denylist: password,
 * client_secret, code, code_verifier, *token* etc. are simply never listed).
 * session_id / jti / revoked_session_id are opaque correlation ids, not PII.
 */
const DATA_KEY_ALLOW_LIST = [
    'grant_type',
    'scope',
    'response_type',
    'prompt',
    'error',
    'error_code',
    'reason',
    'client_name',
    'realm_name',
    'session_id',
    'jti',
    'revoked_session_id',
] as const;

const DATA_VALUE_MAX_LENGTH = 512;

export function sanitizeAuditEventData(
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

    if (Object.keys(output).length === 0) {
        return null;
    }

    return output;
}
