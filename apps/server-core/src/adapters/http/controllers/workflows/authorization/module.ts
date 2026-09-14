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
 * trees, for a console or a resource server to evaluate outside this process
 * together with the grants an introspection reports. It is the same for every
 * authenticated caller (what `GET /permissions` plus `GET /policies` already
 * answer to any principal), so a consumer fetches it once per process and
 * caches it; `private, no-cache` keeps a shared cache from storing it while a
 * private one may revalidate through the ETag.
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
