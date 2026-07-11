/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Fixed event vocabulary (never free text). The (scope, name) pair
 * classifies an event; ref_type/ref_id point at the affected resource.
 */
export enum EventName {
    LOGIN = 'login',
    LOGIN_FAILED = 'login_failed',
    LOGOUT = 'logout',
    AUTHORIZE = 'authorize',
    REFRESH_REPLAY_DETECTED = 'refresh_replay_detected',
    REGISTER = 'register',
    ACCOUNT_ACTIVATED = 'account_activated',
    PASSWORD_RESET_REQUESTED = 'password_reset_requested',
    PASSWORD_RESET_COMPLETED = 'password_reset_completed',
    CREATED = 'created',
    UPDATED = 'updated',
    DELETED = 'deleted',
}

export enum EventScope {
    OAUTH2 = 'oauth2',
    IDENTITY = 'identity',
    ENTITY = 'entity',
}

export enum EventRefType {
    SESSION = 'session',
    USER = 'user',
    CLIENT = 'client',
}
