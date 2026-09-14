/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A grant references a definition or a policy the supplied catalog does not
 * carry: the caller's cached catalog predates it and must be refetched.
 */
export class AuthorizationCatalogStaleError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthorizationCatalogStaleError';
    }
}
