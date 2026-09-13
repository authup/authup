/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationDocument } from '@authup/access';
import { AUTHORIZATION_DOCUMENT_VERSION } from '@authup/access';
import { ScopeName } from '@authup/core-kit';
import {
    DContext,
    DController,
    DGet,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { AuthorizationDocumentBuilderContext } from '../../../../../core/index.ts';
import {
    buildAuthorizationDocument,
    buildAuthorizationIdentity,
    toIdentityPolicyData,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { useRequestIdentityOrFail, useRequestScopes } from '../../../request/index.ts';

export type AuthorizationControllerContext = AuthorizationDocumentBuilderContext;

/**
 * The caller's own authorization document: held permission definitions with
 * their policies and every grant's realm reach, for a console or a resource
 * server to evaluate outside this process. A per-identity document, never
 * served from a shared cache. A credential without the `global` scope holds
 * no grants server-side, so it receives an empty document.
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
    ): Promise<AuthorizationDocument> {
        event.response.headers.set('cache-control', 'no-store');
        event.response.headers.append('vary', 'cookie');

        const identity = toIdentityPolicyData(useRequestIdentityOrFail(event).raw)!;
        if (!useRequestScopes(event).includes(ScopeName.GLOBAL)) {
            return {
                version: AUTHORIZATION_DOCUMENT_VERSION,
                identity: buildAuthorizationIdentity(identity),
                policies: {},
                permissions: [],
            };
        }

        return buildAuthorizationDocument(this.ctx, identity);
    }
}
