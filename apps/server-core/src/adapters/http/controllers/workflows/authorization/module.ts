/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
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
import { buildActorContext } from '../../../request/index.ts';

/**
 * The identity-free permission catalog: every definition with its policy
 * trees plus every tree a grant can name, for a console or a resource server
 * to evaluate outside this process together with the grants an introspection
 * reports. It is the same for every caller, so a consumer fetches it once per
 * process and caches it; `private, no-cache` keeps a shared cache from storing
 * it, since the gate is per credential.
 *
 * The gate is exactly the one of the entity reads it aggregates: after
 * `ForceLoggedIn`, the pre-gate `GET /permissions` and `GET /policies` run,
 * one of `PERMISSION_READ` / `PERMISSION_UPDATE` / `PERMISSION_DELETE`
 * (reach is neutral there, so a `realm_admin` passes). Every namespace, with
 * the realm and client ids of foreign realms, and every policy configuration,
 * attribute predicates included, is therefore readable here by exactly the
 * principals that may read them one by one. A resource server reads the
 * catalog with its OWN client credential holding `PERMISSION_READ`: the
 * document is identity-free, so the end user's bearer is the wrong credential
 * for it. A console whose user lacks the family falls back to the name-only
 * view, which is COARSER than this catalog rather than equivalent to it: it
 * ignores realm reach and junction policies. That is deliberate for a console,
 * whose gating is advisory, and is what every console user had before this
 * route; a resource server fails closed instead.
 * The catalog is an upper bound on what may be asked, never an
 * entitlement (the same posture as `GET /schemas`); every decision it feeds
 * still runs over the caller's own grants.
 */
@DTags('auth')
@DController('/authorization')
export class AuthorizationController {
    protected ctx: AuthorizationCatalogBuilderContext;

    constructor(ctx: AuthorizationCatalogBuilderContext) {
        this.ctx = ctx;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async get(
        @DContext() event: IAppEvent,
    ): Promise<AuthorizationCatalog> {
        await buildActorContext(event).permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        event.response.headers.set('cache-control', 'private, no-cache');

        return buildAuthorizationCatalog(this.ctx);
    }
}
