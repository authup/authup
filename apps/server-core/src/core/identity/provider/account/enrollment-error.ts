/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError, markInstanceof, matchesInstanceof } from '@authup/errors';

export const IDENTITY_PROVIDER_ENROLLMENT_DENIED_ERROR_INSTANCE = Symbol.for('@authup/server-core/IdentityProviderEnrollmentDeniedError');

/**
 * The provider's enrollment gate refused a FIRST login for an unknown
 * external subject: `enrollmentEnabled` is false, or `enrollmentPolicyId`
 * denied the user row the login would have created. A linked account never
 * reaches it.
 *
 * Marker-only, like `IdentityProviderAssuranceError`: it adds no dedicated
 * `ErrorCode` and keeps `ValidationError`'s shared `BAD_REQUEST`, so a code
 * fallback in the guard would match every other `ValidationError` in the
 * process. The federated login swallows it into a redirect (`access_denied`)
 * and the reason goes to the log. On the LDAP password grant the composite
 * `CredentialsAuthenticator` throws its LAST strategy's error, so the caller
 * sees `UserAuthenticator`'s `entity_credentials_invalid`, indistinguishable
 * from a wrong password (right for an anonymous token endpoint: a distinct
 * error would confirm the LDAP bind succeeded); the LDAP collection
 * authenticator logs the reason before the error is displaced.
 */
export class IdentityProviderEnrollmentDeniedError extends ValidationError {
    constructor(message: string) {
        super(message);
        markInstanceof(this, IDENTITY_PROVIDER_ENROLLMENT_DENIED_ERROR_INSTANCE);
    }
}

export function isIdentityProviderEnrollmentDeniedError(input: unknown): input is IdentityProviderEnrollmentDeniedError {
    return matchesInstanceof(input, IDENTITY_PROVIDER_ENROLLMENT_DENIED_ERROR_INSTANCE);
}
