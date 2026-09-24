/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Gates the creation of a local user on a FIRST federated login for an
 * unknown external subject. Both are extra attributes on every protocol
 * (stored like `requiredAmr` / `requiredAcr`, no columns), and neither
 * applies to an account that is already linked.
 */
export type IdentityProviderEnrollmentAttributes = {
    /**
     * `null` / `undefined` means enabled: a first login creates the user.
     * `false` refuses a first login for an unknown subject.
     */
    enrollmentEnabled?: boolean | null,

    /**
     * A policy evaluated over the user row that WOULD be created (the
     * validated mapped attributes: name, email, emailVerified, displayName,
     * pathId, realmId, ...) under `ATTRIBUTES` alone, with no identity.
     * A deny, an unloadable tree or a tree of a foreign realm refuses the
     * creation.
     */
    enrollmentPolicyId?: string | null,
};
