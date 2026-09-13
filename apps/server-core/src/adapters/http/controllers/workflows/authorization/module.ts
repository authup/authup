/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationDocument, IdentityPolicyData } from '@authup/access';
import { PermissionError } from '@authup/access';
import { ScopeName } from '@authup/core-kit';
import {
    DContext,
    DController,
    DGet,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { AuthorizationDocumentBuilderContext } from '../../../../../core/index.ts';
import { buildAuthorizationDocument } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { useRequestIdentityOrFail, useRequestScopes } from '../../../request/index.ts';

export type AuthorizationControllerContext = AuthorizationDocumentBuilderContext;

/**
 * The caller's own authorization document: held permission definitions with
 * their policies and every grant's realm reach, for a console or a resource
 * server to evaluate outside this process. A per-identity document, never
 * served from a shared cache.
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

        const identity = useRequestIdentityOrFail(event);
        if (!useRequestScopes(event).includes(ScopeName.GLOBAL)) {
            throw new PermissionError({ message: 'The credential does not carry the global scope.' });
        }

        const data : IdentityPolicyData = {
            type: identity.type,
            id: identity.id,
            clientId: identity.clientId ?? null,
            realmId: identity.realmId ?? null,
            realmName: identity.realmName ?? null,
        };

        return buildAuthorizationDocument(this.ctx, data);
    }
}
