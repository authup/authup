/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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

/**
 * The exact entity-property renames plan 073 performed — every property whose
 * physical column name (the pre-073 API form) differs from today's camelCase
 * property, extracted from the TypeORM entity metadata
 * (`@Column({ name: 'snake_col' })` pairs across every entity), plus
 * `realm_name` (a legal pre-073 identity-bag key read by REALM_MATCH — not a
 * column). VALUE transforms are restricted to this vocabulary — a generic
 * snake→camel transform would ALSO camelize references to live snake_case
 * user/role ATTRIBUTE keys (role-attribute keys were never renamed by 073,
 * and post-073-authored snake user-attribute keys are legal), silently
 * breaking a working `invert` denylist — the very fail-open this migration
 * exists to fix. A stale reference OUTSIDE this vocabulary stays stale
 * (the pre-existing state, called out in the release notes), which is the
 * safe direction.
 */
export const PROPERTY_RENAMES: [string, string][] = [
    ['access_policy_id', 'accessPolicyId'],
    ['access_token', 'accessToken'],
    ['activate_hash', 'activateHash'],
    ['actor_id', 'actorId'],
    ['actor_name', 'actorName'],
    ['actor_type', 'actorType'],
    ['auth_method', 'authMethod'],
    ['base_url', 'baseUrl'],
    ['built_in', 'builtIn'],
    ['client_id', 'clientId'],
    ['client_realm_id', 'clientRealmId'],
    ['consumed_at', 'consumedAt'],
    ['created_at', 'createdAt'],
    ['decision_strategy', 'decisionStrategy'],
    ['decryption_key', 'decryptionKey'],
    ['display_name', 'displayName'],
    ['encryption_key', 'encryptionKey'],
    ['expires_at', 'expiresAt'],
    ['expires_in', 'expiresIn'],
    ['first_name', 'firstName'],
    ['grant_types', 'grantTypes'],
    ['ip_address', 'ipAddress'],
    ['last_name', 'lastName'],
    ['last_used_at', 'lastUsedAt'],
    ['mfa_at', 'mfaAt'],
    ['name_locked', 'nameLocked'],
    ['parent_id', 'parentId'],
    ['permission_id', 'permissionId'],
    ['permission_realm_id', 'permissionRealmId'],
    ['policy_id', 'policyId'],
    ['policy_realm_id', 'policyRealmId'],
    ['post_logout_redirect_uri', 'postLogoutRedirectUri'],
    ['provider_id', 'providerId'],
    ['provider_realm_id', 'providerRealmId'],
    ['provider_user_email', 'providerUserEmail'],
    ['provider_user_id', 'providerUserId'],
    ['provider_user_name', 'providerUserName'],
    ['realm_id', 'realmId'],
    ['realm_name', 'realmName'],
    ['realm_scope', 'realmScope'],
    ['redirect_uri', 'redirectUri'],
    ['ref_id', 'refId'],
    ['ref_type', 'refType'],
    ['refresh_token', 'refreshToken'],
    ['refresh_token_id', 'refreshTokenId'],
    ['refreshed_at', 'refreshedAt'],
    ['request_ip_address', 'requestIpAddress'],
    ['request_method', 'requestMethod'],
    ['request_path', 'requestPath'],
    ['request_user_agent', 'requestUserAgent'],
    ['reset_at', 'resetAt'],
    ['reset_expires', 'resetExpires'],
    ['reset_hash', 'resetHash'],
    ['revoked_at', 'revokedAt'],
    ['role_id', 'roleId'],
    ['role_realm_id', 'roleRealmId'],
    ['root_url', 'rootUrl'],
    ['scope_id', 'scopeId'],
    ['scope_realm_id', 'scopeRealmId'],
    ['secret_encrypted', 'secretEncrypted'],
    ['secret_hashed', 'secretHashed'],
    ['seen_at', 'seenAt'],
    ['session_id', 'sessionId'],
    ['signature_algorithm', 'signatureAlgorithm'],
    ['status_message', 'statusMessage'],
    ['sub_kind', 'subKind'],
    ['synchronization_mode', 'synchronizationMode'],
    ['target_name', 'targetName'],
    ['target_value', 'targetValue'],
    ['token_binding_method', 'tokenBindingMethod'],
    ['updated_at', 'updatedAt'],
    ['user_agent', 'userAgent'],
    ['user_id', 'userId'],
    ['user_realm_id', 'userRealmId'],
    ['value_is_regex', 'valueIsRegex'],
];

const SNAKE_TO_CAMEL = new Map(PROPERTY_RENAMES);
const CAMEL_TO_SNAKE = new Map(PROPERTY_RENAMES.map(([from, to]) => [to, from] as [string, string]));

/**
 * Property paths are transformed PER DOT SEGMENT — rapiq treats dotted keys
 * as nested relation paths, and a whole-path transform would collapse
 * `user.realm_id` into `userRealmId`. Segments outside the enumerated
 * vocabulary pass through untouched, which also makes both directions
 * idempotent.
 */
export function camelizePropertyPath(value: string): string {
    return value
        .split('.')
        .map((segment) => SNAKE_TO_CAMEL.get(segment) ?? segment)
        .join('.');
}

export function snakizePropertyPath(value: string): string {
    return value
        .split('.')
        .map((segment) => CAMEL_TO_SNAKE.get(segment) ?? segment)
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

    // null prototype: a JSON.parse'd own `__proto__` key would otherwise hit
    // the prototype setter on assignment and silently vanish from the output.
    const output: Record<string, unknown> = Object.create(null);
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
