/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum TranslatorTranslationGroup {
    DEFAULT = 'default',

    CLIENT = 'authupClient',

    VUECS = 'vuecs',
    VUELIDATE = 'vuelidate',
}

export enum TranslatorTranslationVuecsKey {
    NO_MORE = 'noMore',
}

export enum TranslatorTranslationClientKey {
    NAME_HINT = 'nameHint',
    DESCRIPTION_HINT = 'descriptionHint',
    REDIRECT_URI_HINT = 'redirectURIHint',
    IS_CONFIDENTIAL = 'isConfidential',
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
    DESCRIPTION = 'description',
    PERMISSIONS = 'permissions',
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
