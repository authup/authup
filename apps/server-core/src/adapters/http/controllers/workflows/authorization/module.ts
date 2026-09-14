/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import {
    DContext,
    DController,
    DGet,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { AuthorizationCatalogBuilderContext } from '../../../../../core/index.ts';
import { buildAuthorizationCatalog } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';

export type AuthorizationControllerContext = AuthorizationCatalogBuilderContext;

/**
 * The identity-free permission catalog: every definition with its policy
 * trees plus every tree a grant can name, for a console or a resource server
 * to evaluate outside this process together with the grants an introspection
 * reports. It is the same for every caller, so a consumer fetches it once per
 * process and caches it; `private, no-cache` keeps a shared cache from storing
 * it while a private one may revalidate through the ETag.
 *
 * The gate is `ForceLoggedIn` alone, which is WIDER than the entity reads:
 * `GET /permissions` and `GET /policies` both require one of the
 * `PERMISSION_READ` / `PERMISSION_UPDATE` / `PERMISSION_DELETE` grants, so a
 * principal holding none of them can read every namespace (with the realm and
 * client ids of foreign realms) and every policy configuration (attribute
 * predicates included) here and nowhere else. The width is structural rather
 * than incidental: a console evaluates the catalog for whichever identity
 * signed in, most of which hold no permission-family grant, and a resource
 * server evaluates it for every subject whose token it verifies; a per-caller
 * narrowing would be the per-identity document again and could not be
 * cached. The catalog is an upper bound on what may be asked, never an
 * entitlement (the same posture as `GET /schemas`); every decision it feeds
 * still runs over the caller's own grants.
 */
@DTags('auth')
@DController('/authorization')
export class AuthorizationController {
    protected ctx: AuthorizationControllerContext;

    constructor(ctx: AuthorizationControllerContext) {
        this.ctx = ctx;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async get(
        @DContext() event: IAppEvent,
    ): Promise<AuthorizationCatalog> {
        event.response.headers.set('cache-control', 'private, no-cache');

        return buildAuthorizationCatalog(this.ctx);
    }
}
