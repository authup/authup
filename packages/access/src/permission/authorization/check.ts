/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { matchesInstanceof } from '@authup/errors';
import type { AuthorizationCatalogStaleError } from './error';
import { AUTHORIZATION_CATALOG_STALE_ERROR_INSTANCE } from './error';

/**
 * Marker-only: the error carries no code of its own, and it never crosses a
 * wire boundary, so there is no shape to fall back to.
 */
export function isAuthorizationCatalogStaleError(input: unknown) : input is AuthorizationCatalogStaleError {
    return matchesInstanceof(input, AUTHORIZATION_CATALOG_STALE_ERROR_INSTANCE);
}
