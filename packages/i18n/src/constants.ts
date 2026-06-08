/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Catalog namespace names. Mirrors ilingo 6's catalog terminology —
 * namespaces are the dotted root paths under each locale.
 *
 * The `validup` namespace (validation-message catalogs for `IssueCode`
 * keys) is registered automatically by `@ilingo/validup-vue`'s install
 * and is **not** part of this enum. The `ERROR` namespace below holds
 * authup's own domain error-code messages (keyed by `@authup/errors`'
 * `ErrorCode`), resolved client-side from a server error's code + data.
 */
export enum TranslatorTranslationNamespace {
    DEFAULT = 'default',

    CLIENT = 'authupClient',

    VUECS = 'vuecs',

    ERROR = 'authupError',

    APP = 'app',
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

    LOGIN_FAILED = 'loginFailed',
    SCOPE_GRANT_INTRO = 'scopeGrantIntro',
    ONCE_AUTHORIZED_REDIRECT = 'onceAuthorizedRedirect',
    GOVERNED_BY = 'governedBy',
    ACTIVE_SINCE = 'activeSince',
    VIEW_POLICY_DETAILS = 'viewPolicyDetails',
}

/**
 * App-only chrome: navigation labels, page-title decoration
 * (management/details), the sidebar session countdown, header
 * accessibility labels, and the parameterized success toasts. These live
 * apart from {@see TranslatorTranslationDefaultKey} because they are
 * consumed exclusively by `apps/client-web`, never by the reusable
 * `@authup/client-web-kit` components.
 */
export enum TranslatorTranslationAppKey {
    HOME = 'home',
    RESOURCES = 'resources',
    GENERAL = 'general',
    OTHER = 'other',
    SETTINGS = 'settings',
    LOGOUT = 'logout',
    ACCOUNT = 'account',
    SECURITY = 'security',

    MANAGEMENT = 'management',
    DETAILS = 'details',
    API_DOCS = 'apiDocs',

    URL_GENERATOR = 'urlGenerator',
    URL_GENERATOR_HINT = 'urlGeneratorHint',
    REDIRECT_URL = 'redirectUrl',
    GENERATED_URL = 'generatedUrl',

    TOGGLE_NAVIGATION = 'toggleNavigation',
    SWITCH_TO_LIGHT_MODE = 'switchToLightMode',
    SWITCH_TO_DARK_MODE = 'switchToDarkMode',

    SESSION_RENEW = 'sessionRenew',
    MINUTES = 'minutes',
    SECONDS = 'seconds',

    ENTITY_CREATED = 'entityCreated',
    ENTITY_UPDATED = 'entityUpdated',
    ENTITY_DELETED = 'entityDeleted',
    ACCOUNT_UPDATED = 'accountUpdated',
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

    GENERAL = 'general',
    LOGIN = 'login',
    PASSWORD = 'password',
    START = 'start',
    END = 'end',
    INTERVAL = 'interval',
    DAY_OF_WEEK = 'dayOfWeek',
    DAY_OF_MONTH = 'dayOfMonth',
    DAY_OF_YEAR = 'dayOfYear',
    URL = 'url',
    APPLICATION = 'application',
    AUTHORIZE = 'authorize',
    ABORT = 'abort',
    LOADING = 'loading',

    CLIENT = 'client',
    CLIENTS = 'clients',
    CLIENT_SCOPES = 'clientScopes',
    DISPLAY_NAME = 'displayName',
    EMAIL = 'email',
    EXTERNAL_ID = 'externalId',
    HASHED = 'hashed',
    OVERVIEW = 'overview',
    IDENTITY_PROVIDER = 'identityProvider',
    IDENTITY_PROVIDERS = 'identityProviders',
    NAME = 'name',
    DECISION_STRATEGY = 'decisionStrategy',
    DESCRIPTION = 'description',
    PERMISSION = 'permission',
    PERMISSIONS = 'permissions',
    POLICY = 'policy',
    POLICIES = 'policies',
    REALM = 'realm',
    ROBOT = 'robot',
    ROBOTS = 'robots',
    REALMS = 'realms',
    ROLE = 'role',
    ROLES = 'roles',
    SCOPE = 'scope',
    SCOPES = 'scopes',
    SECRET = 'secret',
    REDIRECT_URIS = 'redirectUris',
    USER = 'user',
    USERS = 'users',
}
