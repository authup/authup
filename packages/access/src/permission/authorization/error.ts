/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, markInstanceof } from '@authup/errors';

export const AUTHORIZATION_CATALOG_STALE_ERROR_INSTANCE = Symbol.for('@authup/access/AuthorizationCatalogStaleError');

/**
 * A grant references a definition or a policy the supplied catalog does not
 * carry: the caller's cached catalog predates the definition or the junction
 * row and must be refetched. A definition the catalog carries with
 * `policies: null`, and one whose tree this copy cannot project, are not
 * stale but unevaluable, and a grant of either is dropped.
 *
 * Recognize it with `isAuthorizationCatalogStaleError`, never `instanceof`:
 * this package is a plain caret dependency of several workspaces, so a
 * consumer tree may resolve two copies of it and turn the one recoverable
 * state into an unrecoverable one.
 */
export class AuthorizationCatalogStaleError extends AuthupError {
    constructor(message: string) {
        super({ message });

        this.name = 'AuthorizationCatalogStaleError';
        markInstanceof(this, AUTHORIZATION_CATALOG_STALE_ERROR_INSTANCE);
    }
}
