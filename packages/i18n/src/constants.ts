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

    MAIL = 'authupMail',
}

export enum TranslatorTranslationVuecsKey {
    NO_MORE = 'noMore',
}

export enum TranslatorTranslationClientKey {
    NAME_HINT = 'nameHint',
    DESCRIPTION_HINT = 'descriptionHint',
    REDIRECT_URI_HINT = 'redirectURIHint',
    POST_LOGOUT_REDIRECT_URI_HINT = 'postLogoutRedirectURIHint',
    GRANT_TYPES_HINT = 'grantTypesHint',
    AUTH_METHOD = 'authMethod',
    AUTH_METHOD_NONE = 'authMethodNone',
    AUTH_METHOD_SECRET = 'authMethodSecret',
    AUTH_METHOD_TLS = 'authMethodTls',
    TOKEN_BINDING_METHOD = 'tokenBindingMethod',
    TOKEN_BINDING_METHOD_NONE = 'tokenBindingMethodNone',
    TOKEN_BINDING_METHOD_TLS = 'tokenBindingMethodTls',
    CLIENT_CERTIFICATE_URI = 'clientCertificateUri',
    CLIENT_CERTIFICATE_URI_HINT = 'clientCertificateUriHint',
    IS_ACTIVE = 'isActive',
    HASH_SECRET = 'hashSecret',

    LOGIN_FAILED = 'loginFailed',
    SCOPE_GRANT_INTRO = 'scopeGrantIntro',
    ONCE_AUTHORIZED_REDIRECT = 'onceAuthorizedRedirect',
    GOVERNED_BY = 'governedBy',
    ACTIVE_SINCE = 'activeSince',
    VIEW_POLICY_DETAILS = 'viewPolicyDetails',
    PRIVACY_POLICY = 'privacyPolicy',
    TERMS_OF_SERVICE = 'termsOfService',

    POLICY_TYPE_COMPOSITE = 'policyTypeComposite',
    POLICY_TYPE_DATE = 'policyTypeDate',
    POLICY_TYPE_TIME = 'policyTypeTime',
    POLICY_TYPE_ATTRIBUTE_NAMES = 'policyTypeAttributeNames',
    POLICY_TYPE_ATTRIBUTES = 'policyTypeAttributes',
    POLICY_TYPE_REALM_MATCH = 'policyTypeRealmMatch',
    POLICY_TYPE_IDENTITY = 'policyTypeIdentity',
    POLICY_TYPE_PERMISSION_BINDING = 'policyTypePermissionBinding',

    DECISION_STRATEGY_HINT_UNANIMOUS = 'decisionStrategyHintUnanimous',
    DECISION_STRATEGY_HINT_AFFIRMATIVE = 'decisionStrategyHintAffirmative',
    DECISION_STRATEGY_HINT_CONSENSUS = 'decisionStrategyHintConsensus',
    DECISION_STRATEGY_HINT_DEFAULT = 'decisionStrategyHintDefault',
    OPTION_NONE_UNANIMOUS = 'optionNoneUnanimous',

    REALM_MATCH_STRICT_HINT = 'realmMatchStrictHint',
    REALM_MATCH_NULL_MATCH_ALL_HINT = 'realmMatchNullMatchAllHint',

    ENABLE_STARTTLS_HINT = 'enableStartTlsHint',
    PASSWORD_MUST_MATCH = 'passwordMustMatch',
    LOOKUP_FAILED = 'lookupFailed',
    PROTOCOL_NOT_SUPPORTED = 'protocolNotSupported',

    JUNCTION_POLICY = 'junctionPolicy',
    JUNCTION_REALM_SCOPE = 'junctionRealmScope',
    REALM_SCOPE_NONE = 'realmScopeNone',
    REALM_SCOPE_NONE_HINT = 'realmScopeNoneHint',
    REALM_SCOPE_OWN = 'realmScopeOwn',
    REALM_SCOPE_OWN_HINT = 'realmScopeOwnHint',
    REALM_SCOPE_OWN_OR_NULL = 'realmScopeOwnOrNull',
    REALM_SCOPE_OWN_OR_NULL_HINT = 'realmScopeOwnOrNullHint',
    REALM_SCOPE_ANY = 'realmScopeAny',
    REALM_SCOPE_ANY_HINT = 'realmScopeAnyHint',
    SELECTION_UPDATING = 'selectionUpdating',
    SELECTION_REMOVE = 'selectionRemove',
    SELECTION_ADD = 'selectionAdd',

    CREATE_ACCOUNT = 'createAccount',
    FORGOT_PASSWORD = 'forgotPassword',
    RESET_PASSWORD = 'resetPassword',
    ACTIVATE_ACCOUNT = 'activateAccount',
    BACK_TO_LOGIN = 'backToLogin',
    EMAIL_OR_NAME = 'emailOrName',
    CHECK_EMAIL_ACTIVATE = 'checkEmailActivate',
    CHECK_EMAIL_RESET = 'checkEmailReset',
    ACCOUNT_ACTIVATED = 'accountActivated',
    PASSWORD_RESET_DONE = 'passwordResetDone',
    WORKFLOW_DISABLED = 'workflowDisabled',

    REALM_MISMATCH_TITLE = 'realmMismatchTitle',
    REALM_MISMATCH_TEXT = 'realmMismatchText',
    SIGN_IN_TO_REALM = 'signInToRealm',
    RETURN_TO_APP = 'returnToApp',
    RETURNING_TO_APP = 'returningToApp',
    OPEN_APP = 'openApp',

    REAUTH_TEXT = 'reauthText',

    SELECT_ACCOUNT_TITLE = 'selectAccountTitle',
    CONTINUE_AS = 'continueAs',
    USE_ANOTHER_ACCOUNT = 'useAnotherAccount',
    SIGNED_IN_AS = 'signedInAs',
    NOT_YOU = 'notYou',

    AUTHORIZE_ABORTED = 'authorizeAborted',

    ACCESS_DENIED_TITLE = 'accessDeniedTitle',
    ACCESS_DENIED_TEXT = 'accessDeniedText',
    CLIENT_ACCESS_POLICY_HINT = 'clientAccessPolicyHint',

    CONSENT_STATUS_LOADING = 'consentStatusLoading',

    LOGOUT_CONFIRM_TITLE = 'logoutConfirmTitle',
    LOGOUT_CONFIRM_TEXT = 'logoutConfirmText',
    LOGOUT_DONE = 'logoutDone',
    SIGN_OUT = 'signOut',

    ACCOUNT_SIGN_IN_INTRO = 'accountSignInIntro',

    MFA_TITLE = 'mfaTitle',
    MFA_CHALLENGE_INTRO = 'mfaChallengeIntro',
    MFA_CODE = 'mfaCode',
    MFA_CODE_HINT = 'mfaCodeHint',
    MFA_VERIFY = 'mfaVerify',
    MFA_USE_RECOVERY = 'mfaUseRecovery',
    MFA_USE_AUTHENTICATOR = 'mfaUseAuthenticator',
    MFA_RECOVERY_CODE = 'mfaRecoveryCode',
    MFA_FAILED = 'mfaFailed',
    MFA_SETUP_REQUIRED = 'mfaSetupRequired',

    MFA_USE_EMAIL = 'mfaUseEmail',
    MFA_USE_PASSKEY = 'mfaUsePasskey',
    MFA_PASSKEY_PROMPT = 'mfaPasskeyPrompt',
    MFA_SEND_CODE = 'mfaSendCode',
    MFA_CODE_SENT = 'mfaCodeSent',

    MFA_ENROLL_TITLE = 'mfaEnrollTitle',
    MFA_ENROLL_TOTP = 'mfaEnrollTotp',
    MFA_ENROLL_RECOVERY = 'mfaEnrollRecovery',
    MFA_ENROLL_EMAIL = 'mfaEnrollEmail',
    MFA_ENROLL_WEBAUTHN = 'mfaEnrollWebauthn',

    KEY_USE_SIGNATURE = 'keyUseSignature',
    KEY_USE_ENCRYPTION = 'keyUseEncryption',
    KEY_IMPORT_MATERIAL = 'keyImportMaterial',
    KEY_MATERIAL_OCT = 'keyMaterialOct',
    KEY_MATERIAL_PRIVATE = 'keyMaterialPrivate',
    KEY_MATERIAL_PUBLIC = 'keyMaterialPublic',
    MFA_SCAN_QR = 'mfaScanQr',
    MFA_MANUAL_KEY = 'mfaManualKey',
    MFA_CONFIRM_INTRO = 'mfaConfirmIntro',
    MFA_CONFIRM = 'mfaConfirm',
    MFA_RECOVERY_INTRO = 'mfaRecoveryIntro',
    MFA_RECOVERY_SAVE = 'mfaRecoverySave',
    MFA_DOWNLOAD = 'mfaDownload',
    MFA_ENROLLED = 'mfaEnrolled',
    MFA_DEVICE_NAME = 'mfaDeviceName',
    MFA_NO_DEVICES = 'mfaNoDevices',
    MFA_DEVICE_UNCONFIRMED = 'mfaDeviceUnconfirmed',
    MFA_RECOVERY_NUDGE = 'mfaRecoveryNudge',
    MFA_RECOVERY_NUDGE_GENERATE = 'mfaRecoveryNudgeGenerate',
    MFA_RECOVERY_NUDGE_SKIP = 'mfaRecoveryNudgeSkip',
}

/**
 * Application chrome: navigation labels, page-title decoration
 * (management/details), the sidebar session countdown, header
 * accessibility labels, and the parameterized success toasts. These live
 * apart from the shared entity/field/action/common namespaces because
 * they belong to authup's own application surfaces (the admin console and
 * the server-core-embedded account console), not to the reusable form /
 * collection components a downstream consumer embeds.
 */
export enum TranslatorTranslationAppKey {
    HOME = 'home',
    RESOURCES = 'resources',
    GENERAL = 'general',
    OTHER = 'other',
    SETTINGS = 'settings',
    LOGOUT = 'logout',
    ACCOUNT = 'account',
    MANAGE_ACCOUNT = 'manageAccount',
    SECURITY = 'security',

    MANAGEMENT = 'management',
    DETAILS = 'details',

    /**
     * One line under a section heading, saying what the section holds.
     */
    REALM_DESCRIPTION = 'realmDescription',
    CLIENT_DESCRIPTION = 'clientDescription',
    SCOPE_DESCRIPTION = 'scopeDescription',
    IDENTITY_PROVIDER_DESCRIPTION = 'identityProviderDescription',
    KEY_DESCRIPTION = 'keyDescription',
    TRUST_ANCHOR_DESCRIPTION = 'trustAnchorDescription',
    USER_DESCRIPTION = 'userDescription',
    ROLE_DESCRIPTION = 'roleDescription',
    PERMISSION_DESCRIPTION = 'permissionDescription',
    POLICY_DESCRIPTION = 'policyDescription',
    EVENT_DESCRIPTION = 'eventDescription',
    SESSION_DESCRIPTION = 'sessionDescription',
    SET_MANAGEMENT_REALM = 'setManagementRealm',
    API_DOCS = 'apiDocs',
    MADE_WITH = 'madeWith',

    LOGIN_TITLE = 'loginTitle',
    LOGIN_SUBTITLE = 'loginSubtitle',

    URL_GENERATOR = 'urlGenerator',
    URL_GENERATOR_HINT = 'urlGeneratorHint',
    REDIRECT_URL = 'redirectUrl',
    GENERATED_URL = 'generatedUrl',

    TOGGLE_NAVIGATION = 'toggleNavigation',

    SESSION_RENEW = 'sessionRenew',
    MINUTES = 'minutes',
    SECONDS = 'seconds',

    ENTITY_CREATED = 'entityCreated',
    ENTITY_UPDATED = 'entityUpdated',
    ENTITY_DELETED = 'entityDeleted',
    ACCOUNT_UPDATED = 'accountUpdated',

    DELETE_CONFIRM_TITLE = 'deleteConfirmTitle',
    DELETE_CONFIRM_DESCRIPTION = 'deleteConfirmDescription',

    REMOVE_CONFIRM_TITLE = 'removeConfirmTitle',
    REMOVE_CONFIRM_DESCRIPTION = 'removeConfirmDescription',

    SESSION_REVOKE_OTHERS = 'sessionRevokeOthers',
    SESSION_REVOKE_OTHERS_CONFIRM_TITLE = 'sessionRevokeOthersConfirmTitle',
    SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION = 'sessionRevokeOthersConfirmDescription',
    SESSION_REVOKE_OTHERS_SUCCESS = 'sessionRevokeOthersSuccess',
    KEY_DELETE_FORCE_CONFIRM_TITLE = 'keyDeleteForceConfirmTitle',
    KEY_DELETE_FORCE_CONFIRM_DESCRIPTION = 'keyDeleteForceConfirmDescription',

    SESSION_REVOKE_ALL = 'sessionRevokeAll',
    SESSION_REVOKE_ALL_CONFIRM_TITLE = 'sessionRevokeAllConfirmTitle',
    SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION = 'sessionRevokeAllConfirmDescription',
    SESSION_REVOKE_ALL_SUCCESS = 'sessionRevokeAllSuccess',

    SESSION_CURRENT = 'sessionCurrent',
    SESSION_TOKEN_STATUS_ACTIVE = 'sessionTokenStatusActive',
    SESSION_TOKEN_STATUS_CONSUMED = 'sessionTokenStatusConsumed',
    SESSION_TOKEN_STATUS_REVOKED = 'sessionTokenStatusRevoked',
    SESSION_TOKEN_STATUS_EXPIRED = 'sessionTokenStatusExpired',

    AUTHENTICATOR = 'authenticator',
    MFA_SECURITY_TITLE = 'mfaSecurityTitle',
    MFA_SECURITY_HINT = 'mfaSecurityHint',

    APPLICATIONS = 'applications',
    CONSENT_EMPTY = 'consentEmpty',
    CONSENT_REVOKE = 'consentRevoke',
    CONSENT_REVOKE_ALL = 'consentRevokeAll',
    CONSENT_REVOKE_ALL_SUCCESS = 'consentRevokeAllSuccess',
    CONSENT_REVOKE_ALL_TITLE = 'consentRevokeAllTitle',
    CONSENT_REVOKE_ALL_DESCRIPTION = 'consentRevokeAllDescription',
    CONSENT_SCOPES = 'consentScopes',

    CONNECTED_ACCOUNTS = 'connectedAccounts',
    CONNECTED_ACCOUNTS_NONE = 'connectedAccountsNone',
    IDENTITY_PROVIDER_CONNECT = 'identityProviderConnect',
    IDENTITY_PROVIDER_CONNECTED_AS = 'identityProviderConnectedAs',
    IDENTITY_PROVIDER_DISCONNECT = 'identityProviderDisconnect',
    IDENTITY_PROVIDER_DISCONNECT_CONFIRM_TITLE = 'identityProviderDisconnectConfirmTitle',
    IDENTITY_PROVIDER_DISCONNECT_CONFIRM_DESCRIPTION = 'identityProviderDisconnectConfirmDescription',
    IDENTITY_PROVIDER_LINK_SUCCESS = 'identityProviderLinkSuccess',
    IDENTITY_PROVIDER_LINK_FAILED = 'identityProviderLinkFailed',

    BACK_TO_APP = 'backToApp',
}

/**
 * Transactional mail copy (subject lines, body paragraphs, call-to-action
 * labels, hints) for the identity workflows — registration activation and
 * password reset. Registered under the `authupMail` namespace; consumed
 * server-side by `apps/server-core`'s mail template renderer. Values may
 * carry ilingo `{{var}}` placeholders (e.g. `{{minutes}}`).
 */
export enum TranslatorTranslationMailKey {
    CODE = 'code',

    REGISTRATION_ACTIVATION_SUBJECT = 'registrationActivationSubject',
    REGISTRATION_ACTIVATION_INTRO = 'registrationActivationIntro',
    REGISTRATION_ACTIVATION_ACTION = 'registrationActivationAction',
    REGISTRATION_ACTIVATION_HINT = 'registrationActivationHint',

    PASSWORD_RESET_SUBJECT = 'passwordResetSubject',
    PASSWORD_RESET_INTRO = 'passwordResetIntro',
    PASSWORD_RESET_ACTION = 'passwordResetAction',
    PASSWORD_RESET_EXPIRY = 'passwordResetExpiry',
    PASSWORD_RESET_HINT = 'passwordResetHint',

    MFA_EMAIL_OTP_SUBJECT = 'mfaEmailOtpSubject',
    MFA_EMAIL_OTP_INTRO = 'mfaEmailOtpIntro',
    MFA_EMAIL_OTP_EXPIRY = 'mfaEmailOtpExpiry',
    MFA_EMAIL_OTP_HINT = 'mfaEmailOtpHint',
}

/**
 * Entity-type nouns. Each key resolves to an ilingo plural node, so the
 * singular vs. plural form is selected by the `count` passed at the call
 * site (`count: 1` → singular, any other → plural) rather than by a
 * separate `*S` key. Registered under the `authupEntity` namespace.
 */
export enum TranslatorTranslationEntityKey {
    CLIENT = 'client',
    CONSENT = 'consent',
    EVENT = 'event',
    IDENTITY_PROVIDER = 'identityProvider',
    IDENTITY_PROVIDER_ACCOUNT = 'identityProviderAccount',
    KEY = 'key',
    PERMISSION = 'permission',
    POLICY = 'policy',
    REALM = 'realm',
    ROLE = 'role',
    SCOPE = 'scope',
    SESSION = 'session',
    SESSION_TOKEN = 'sessionToken',
    TRUST_ANCHOR = 'trustAnchor',
    USER = 'user',
}

/**
 * Entity attribute / form-field labels. Registered under the
 * `authupField` namespace.
 */
export enum TranslatorTranslationFieldKey {
    NAME = 'name',
    NAMES = 'names',
    DISPLAY_NAME = 'displayName',
    EMAIL = 'email',
    EXTERNAL_ID = 'externalId',
    DESCRIPTION = 'description',
    SECRET = 'secret',
    REDIRECT_URIS = 'redirectUris',
    POST_LOGOUT_REDIRECT_URIS = 'postLogoutRedirectUris',
    GRANT_TYPES = 'grantTypes',
    PASSWORD = 'password',
    PASSWORD_REPEAT = 'passwordRepeat',
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
    CODE = 'code',
    ID = 'id',
    TYPE = 'type',
    TYPES = 'types',
    INVERT = 'invert',
    ENABLED = 'enabled',
    CHILDREN = 'children',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    SEEN_AT = 'seenAt',
    EXPIRES_AT = 'expiresAt',
    IP_ADDRESS = 'ipAddress',
    USER_AGENT = 'userAgent',
    AUTH_METHOD = 'authMethod',
    KIND = 'kind',
    SUBJECT = 'subject',
    REFRESHED_AT = 'refreshedAt',
    MFA_AT = 'mfaAt',
    PROTOCOL = 'protocol',
    PROTOCOLS = 'protocols',
    PRESET = 'preset',
    PRESETS = 'presets',
    TIMEOUT = 'timeout',
    START_TLS = 'startTls',
    BASE_DN = 'baseDn',
    FILTER = 'filter',
    CLASS = 'class',
    NAME_ATTRIBUTE = 'nameAttribute',
    MAIL_ATTRIBUTE = 'mailAttribute',
    DISPLAY_NAME_ATTRIBUTE = 'displayNameAttribute',
    MEMBER_ATTRIBUTE = 'memberAttribute',
    MEMBER_USER_ATTRIBUTE = 'memberUserAttribute',
    CLIENT_ID = 'clientId',
    CLIENT_SECRET = 'clientSecret',
    SCOPE = 'scope',
    REQUIRED_AMR = 'requiredAmr',
    REQUIRED_ACR = 'requiredAcr',
    TOKEN = 'token',
    USER_INFO = 'userInfo',
    DISCOVERY = 'discovery',
    REDIRECT_URL = 'redirectUrl',
    ACCESS_POLICY = 'accessPolicy',
    ACTOR = 'actor',
    REF = 'ref',
    PATH = 'path',
    METHOD = 'method',
    USE = 'use',
    STATUS = 'status',
    PRIORITY = 'priority',
    SIGNATURE_ALGORITHM = 'signatureAlgorithm',
    CERTIFICATE = 'certificate',
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
    REGISTER = 'register',
    ACTIVATE = 'activate',
    RESET = 'reset',
    SEND = 'send',
    BACK = 'back',
    CLOSE = 'close',
    LOOKUP = 'lookup',
    SHOW = 'show',
    HIDE = 'hide',
    REMOVE = 'remove',
}

/**
 * Generic UI vocabulary that is neither an entity noun, a field label,
 * nor an action: page-section labels, status terms, and misc. Registered
 * under the `authupCommon` namespace.
 */
export enum TranslatorTranslationCommonKey {
    GENERAL = 'general',
    OVERVIEW = 'overview',
    ALL = 'all',
    LOADING = 'loading',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    LOCKED = 'locked',
    NOT_LOCKED = 'notLocked',
    APPLICATION = 'application',
    SEARCH = 'search',
    NO_RESULTS = 'noResults',
    SWITCH_TO_LIGHT_MODE = 'switchToLightMode',
    SWITCH_TO_DARK_MODE = 'switchToDarkMode',
    YES = 'yes',
    BUILT_IN = 'builtIn',
    GLOBAL = 'global',
    INVERTED = 'inverted',
    CONFIDENTIAL = 'confidential',
    BASIC = 'basic',
    SECURITY = 'security',
    CONNECTION = 'connection',
    ENDPOINTS = 'endpoints',
    DETAILS = 'details',
    GROUP = 'group',
    NO_ITEMS = 'noItems',
    PROCESSING = 'processing',
    REQUEST = 'request',
    DATA = 'data',
    BREADCRUMB = 'breadcrumb',
}
