/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { camelCase, snakeCase } from 'change-case';

/**
 * Shared logic for the PolicyAttributeCamelCase migration pair (both
 * dialects import this module; it lives OUTSIDE the per-dialect folders so
 * the migration glob never loads it as a migration).
 *
 * Plan-073 residual: the shipped CamelCaseAttributes migration renamed
 * attribute KEYS on identity-provider/user attribute tables but left
 * `auth_policy_attributes` untouched entirely — its EA keys, and the
 * entity-property names EMBEDDED IN VALUES (ATTRIBUTES `query` field keys,
 * ATTRIBUTE_NAMES `names` entries, REALM_MATCH `attributeName`), still
 * reference snake_case properties that no longer exist on the camelCase
 * attribute bags. An `invert: true` policy over a never-matching key fails
 * OPEN.
 */

/**
 * EA keys mounted by the built-in policy validators whose pre-073 form was
 * snake_case. Enumerated (not blanket-transformed): policy EA keys are a
 * closed, validator-defined vocabulary and nothing else must be touched.
 */
export const POLICY_ATTRIBUTE_KEY_RENAMES: [string, string][] = [
    ['attribute_name', 'attributeName'],
    ['attribute_name_strict', 'attributeNameStrict'],
    ['attribute_null_match_all', 'attributeNullMatchAll'],
    ['decision_strategy', 'decisionStrategy'],
    ['day_of_week', 'dayOfWeek'],
    ['day_of_month', 'dayOfMonth'],
    ['day_of_year', 'dayOfYear'],
];

// Only true snake_case / camelCase identifiers are transformed — anything
// else (single words, operator payload values, customer-authored oddities)
// passes through untouched, which also makes both directions idempotent.
const SNAKE_SEGMENT = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;
const CAMEL_SEGMENT = /^[a-z0-9]+(?:[A-Z][a-z0-9]*)+$/;

/**
 * Property paths are transformed PER DOT SEGMENT — rapiq treats dotted keys
 * as nested relation paths, and `camelCase('user.realm_id')` would collapse
 * the path into `userRealmId`.
 */
export function camelizePropertyPath(value: string): string {
    return value
        .split('.')
        .map((segment) => (SNAKE_SEGMENT.test(segment) ? camelCase(segment) : segment))
        .join('.');
}

export function snakizePropertyPath(value: string): string {
    return value
        .split('.')
        .map((segment) => (CAMEL_SEGMENT.test(segment) ? snakeCase(segment) : segment))
        .join('.');
}

/**
 * Rewrite the FIELD keys of a mongo-style filters document (the ATTRIBUTES
 * policy `query`). Object keys are either field names / dotted field paths
 * or `$`-operators — `$`-prefixed keys stay verbatim (their payloads still
 * hold field keys and are recursed into: `$and`/`$or`/`$nor` arrays,
 * `$elemMatch`/`$not` sub-documents). VALUES are never touched: an
 * underscore inside `$in: ['my_service']` or a `$regex` pattern is data,
 * not a property name.
 */
function rewriteQueryKeys(node: unknown, transform: (key: string) => string): unknown {
    if (Array.isArray(node)) {
        return node.map((entry) => rewriteQueryKeys(entry, transform));
    }

    if (node === null || typeof node !== 'object') {
        return node;
    }

    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const nextKey = key.startsWith('$') ? key : transform(key);
        output[nextKey] = rewriteQueryKeys(value, transform);
    }

    return output;
}

/**
 * Transform a serialized ATTRIBUTES `query` value. Returns the rewritten
 * serialization, or null when the value must stay untouched (unparseable,
 * not a plain object, or unchanged).
 */
export function transformQueryValue(
    serialized: string,
    transform: (key: string) => string,
): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(serialized);
    } catch {
        return null;
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }

    const rewritten = JSON.stringify(rewriteQueryKeys(parsed, transform));
    return rewritten === serialized ? null : rewritten;
}

/**
 * Transform a serialized ATTRIBUTE_NAMES `names` value (a JSON array of
 * entity property names). Array ENTRIES are property names here — the
 * inverse of the query rule, where array entries are data.
 */
export function transformNamesValue(
    serialized: string,
    transform: (key: string) => string,
): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(serialized);
    } catch {
        return null;
    }

    if (!Array.isArray(parsed)) {
        return null;
    }

    const rewritten = JSON.stringify(
        parsed.map((entry) => (typeof entry === 'string' ? transform(entry) : entry)),
    );
    return rewritten === serialized ? null : rewritten;
}

/**
 * Transform a REALM_MATCH `attributeName` value: a raw property-name string
 * (scalars serialize unquoted) or a JSON array of property names.
 */
export function transformAttributeNameValue(
    raw: string,
    transform: (key: string) => string,
): string | null {
    if (raw.startsWith('[')) {
        return transformNamesValue(raw, transform);
    }

    const rewritten = transform(raw);
    return rewritten === raw ? null : rewritten;
}
