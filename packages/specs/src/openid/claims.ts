/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The OpenID Connect Core §5.1 standard claims about a subject.
 *
 * Declared in a module of its own, importing nothing, so both the id_token
 * payload (`OpenIDTokenPayload`) and the RFC 7662 introspection response
 * (`OAuth2TokenIntrospectionResponse`) can intersect it. The latter lives in
 * `../oauth2`, which `./type` already imports, so declaring the claims there
 * would put the two modules in a cycle.
 *
 * Every claim is optional, and an absent one is an OMITTED key rather than a
 * null: OIDC models an unavailable claim as one that is not returned, so a
 * producer mapping a nullable column onto a claim must skip it rather than
 * emit `null`.
 */
export type OpenIDClaims = {
    // -----------------------------------------------------------------
    // scope: email
    // -----------------------------------------------------------------

    email?: string,

    email_verified?: boolean,

    // -----------------------------------------------------------------
    // scope: phone
    // -----------------------------------------------------------------

    phone_number?: string,

    phone_number_verified?: boolean,

    // -----------------------------------------------------------------
    // scope: address
    // -----------------------------------------------------------------

    address?: Record<string, any>,

    // -----------------------------------------------------------------
    // scope: profile / identity
    // -----------------------------------------------------------------

    name?: string,

    family_name?: string,

    given_name?: string,

    middle_name?: string,

    nickname?: string,

    preferred_username?: string,

    profile?: string,

    picture?: string,

    website?: string,

    gender?: string,

    birthdate?: string,

    roles?: string[],

    zoneinfo?: string,

    locale?: string,

    /**
     * UTC Date in seconds
     */
    updated_at?: number
};
