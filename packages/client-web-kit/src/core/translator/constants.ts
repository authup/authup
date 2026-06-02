/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Catalog namespace names registered by `installTranslator`. Mirrors
 * ilingo 6's catalog terminology — namespaces are the dotted root paths
 * under each locale.
 *
 * The `validup` namespace (validation-message catalogs for `IssueCode`
 * keys) is registered automatically by `@ilingo/validup-vue`'s install
 * and is **not** part of this enum.
 *
 * Historical note: this enum was named `TranslatorTranslationGroup`
 * before the ilingo 6 bump; the rename to "namespace" matches the new
 * upstream terminology.
 */
export enum TranslatorTranslationGroup {
    DEFAULT = 'default',

    CLIENT = 'authupClient',

    VUECS = 'vuecs',
}

export enum TranslatorTranslationVuecsKey {
    NO_MORE = 'noMore',
}

export enum TranslatorTranslationClientKey {
    NAME_HINT = 'nameHint',
    DESCRIPTION_HINT = 'descriptionHint',
    REDIRECT_URI_HINT = 'redirectURIHint',
    IS_CONFIDENTIAL = 'isConfidential',
    IS_ACTIVE = 'isActive',
    HASH_SECRET = 'hashSecret',
}

export enum TranslatorTranslationDefaultKey {
    ADD = 'add',
    CREATE = 'create',
    DELETE = 'delete',
    GENERATE = 'generate',
    UPDATE = 'update',

    ACTIVE = 'active',
    INACTIVE = 'inactive',

    LOCKED = 'locked',
    NOT_LOCKED = 'notLocked',

    VALUE_IS_REGEX = 'valueIsRegex',

    CLIENT = 'client',
    CLIENTS = 'clients',
    CLIENT_SCOPES = 'clientScopes',
    DISPLAY_NAME = 'displayName',
    EMAIL = 'email',
    EXTERNAL_ID = 'externalId',
    HASHED = 'hashed',
    OVERVIEW = 'overview',
    IDENTITY_PROVIDERS = 'identityProviders',
    NAME = 'name',
    DECISION_STRATEGY = 'decisionStrategy',
    DESCRIPTION = 'description',
    PERMISSIONS = 'permissions',
    POLICY = 'policy',
    POLICIES = 'policies',
    REALM = 'realm',
    ROBOTS = 'robots',
    REALMS = 'realms',
    ROLES = 'roles',
    SCOPES = 'scopes',
    SECRET = 'secret',
    REDIRECT_URIS = 'redirectUris',
    USERS = 'users',
}
