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
    LOGIN_FAILED = 'loginFailed',
    LOGOUT = 'logout',
    AUTHORIZE = 'authorize',
    AUTHORIZE_FAILED = 'authorizeFailed',
    REFRESH_REPLAY_DETECTED = 'refreshReplayDetected',
    REGISTER = 'register',
    ACCOUNT_ACTIVATED = 'accountActivated',
    PASSWORD_RESET_REQUESTED = 'passwordResetRequested',
    PASSWORD_RESET_COMPLETED = 'passwordResetCompleted',
    MFA_ENROLLED = 'mfaEnrolled',
    MFA_REMOVED = 'mfaRemoved',
    MFA_VERIFIED = 'mfaVerified',
    MFA_CHALLENGE_FAILED = 'mfaChallengeFailed',
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
    USER_AUTHENTICATOR = 'userAuthenticator',
}
