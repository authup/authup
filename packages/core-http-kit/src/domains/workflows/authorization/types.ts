/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog, AuthorizationCheckPermissions, AuthorizationCheckRealms } from '@authup/access';
import type { AuthorizationHeader } from 'hapic';

export type AuthorizationRequestOptions = {
    /**
     * Read the catalog with another credential than the client's own, the way
     * the kit store hands over the access token it is staging a session for.
     */
    authorizationHeader?: string | AuthorizationHeader,
};

export type AuthorizationCheckPayload = {
    /**
     * The permission namespaces to check. Omitted, every definition the server
     * can resolve is checked, so a caller never maintains a list in step with
     * its own UI: a name missing from a request would fail silently, as a
     * control that quietly disappears.
     */
    names?: string[],
    /**
     * Which resource realms to check against. Omitted, `ownOrNull`: the
     * identity's own realm plus the global rows every realm shares, which is
     * the reach a realm administrator's reads are held at.
     */
    realms?: AuthorizationCheckRealms,
};

export interface IAuthorizationAPI {
    /**
     * The identity-free permission catalog `GET /authorization` serves: every
     * definition with its policy trees. Cache it per process and refetch it
     * when the consumer reports it stale against the grants an introspection
     * carried.
     */
    get(options?: AuthorizationRequestOptions) : Promise<AuthorizationCatalog>;

    /**
     * The caller's OWN verdicts, paired with the realms they hold in, which
     * `POST /authorization/check` serves to any authenticated credential.
     *
     * This is what a public client reads where the catalog is out of reach: it
     * holds no secret, so it can obtain no `client_credentials` token and has
     * no credential of its own for the catalog's gate. The verdicts are
     * authoritative, no policy configuration leaves the server, and the
     * consumer's `@authup/access` version stops having to match the server's.
     *
     * The answer is an upper bound on what may be ATTEMPTED: it is a pre-gate,
     * so a grant whose junction policy needs a resource row passes here and is
     * still decided per row on the server.
     */
    check(
        payload?: AuthorizationCheckPayload,
        options?: AuthorizationRequestOptions,
    ) : Promise<AuthorizationCheckPermissions>;
}
