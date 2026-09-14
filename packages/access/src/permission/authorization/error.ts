/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A grant references a policy the supplied catalog does not carry: the
 * caller's cached catalog predates the junction row and must be refetched.
 * A grant naming a definition the catalog lacks is not stale but dropped,
 * since the server denies such a grant as well.
 */
export class AuthorizationCatalogStaleError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthorizationCatalogStaleError';
    }
}
