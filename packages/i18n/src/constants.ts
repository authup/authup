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
    ENTITY = 'authupEntity',

    FIELD = 'authupField',

    ACTION = 'authupAction',

    COMMON = 'authupCommon',

    CLIENT = 'authupClient',

    VUECS = 'vuecs',

    ERROR = 'authupError',

    APP = 'authupApp',
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
 * apart from the shared entity/field/action/common namespaces because
 * they are consumed exclusively by `apps/client-web`, never by the
 * reusable `@authup/client-web-kit` components.
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
    MADE_WITH = 'madeWith',

    LOGIN_TITLE = 'loginTitle',
    LOGIN_SUBTITLE = 'loginSubtitle',

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

/**
 * Entity-type nouns. Each key resolves to an ilingo plural node, so the
 * singular vs. plural form is selected by the `count` passed at the call
 * site (`count: 1` → singular, any other → plural) rather than by a
 * separate `*S` key. Registered under the `authupEntity` namespace.
 */
export enum TranslatorTranslationEntityKey {
    CLIENT = 'client',
    IDENTITY_PROVIDER = 'identityProvider',
    PERMISSION = 'permission',
    POLICY = 'policy',
    REALM = 'realm',
    ROBOT = 'robot',
    ROLE = 'role',
    SCOPE = 'scope',
    USER = 'user',
}

/**
 * Entity attribute / form-field labels. Registered under the
 * `authupField` namespace.
 */
export enum TranslatorTranslationFieldKey {
    NAME = 'name',
    DISPLAY_NAME = 'displayName',
    EMAIL = 'email',
    EXTERNAL_ID = 'externalId',
    DESCRIPTION = 'description',
    SECRET = 'secret',
    REDIRECT_URIS = 'redirectUris',
    PASSWORD = 'password',
    DECISION_STRATEGY = 'decisionStrategy',
    HASHED = 'hashed',
    URL = 'url',
    CLIENT_SCOPES = 'clientScopes',
    START = 'start',
    END = 'end',
    INTERVAL = 'interval',
    DAY_OF_WEEK = 'dayOfWeek',
    DAY_OF_MONTH = 'dayOfMonth',
    DAY_OF_YEAR = 'dayOfYear',
    VALUE_IS_REGEX = 'valueIsRegex',
}

/**
 * Action verbs / button labels. Registered under the `authupAction`
 * namespace.
 */
export enum TranslatorTranslationActionKey {
    ADD = 'add',
    CREATE = 'create',
    DELETE = 'delete',
    GENERATE = 'generate',
    UPDATE = 'update',
    AUTHORIZE = 'authorize',
    ABORT = 'abort',
    LOGIN = 'login',
}

/**
 * Generic UI vocabulary that is neither an entity noun, a field label,
 * nor an action: page-section labels, status terms, and misc. Registered
 * under the `authupCommon` namespace.
 */
export enum TranslatorTranslationCommonKey {
    GENERAL = 'general',
    OVERVIEW = 'overview',
    LOADING = 'loading',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    LOCKED = 'locked',
    NOT_LOCKED = 'notLocked',
    APPLICATION = 'application',
    SEARCH = 'search',
    NO_RESULTS = 'noResults',
}
