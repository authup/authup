/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { OAuth2SubKind } from '@authup/specs';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { getRequestIP } from 'routup';
import type { OAuth2AuthorizationManagerContext, OAuth2AuthorizationResult } from '../../../core';
import { OAuth2AuthorizationManager } from '../../../core';
import { useRequestIdentityOrFail } from '../../request';

export class HTTPOAuth2AuthorizationManager extends OAuth2AuthorizationManager {
    protected requestValidator : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        super(ctx);

        this.requestValidator = new RoutupContainerAdapter(this.validator);
    }

    async authorizeWithRequest(req: Request) : Promise<OAuth2AuthorizationResult> {
        const codeRequest = await this.validateWithRequest(req);
        const identity = useRequestIdentityOrFail(req);

        return this.authorizeWith(codeRequest, {
            remote_address: getRequestIP(req, { trustProxy: true }),
            sub: identity.id,
            sub_kind: identity.type as `${OAuth2SubKind}`,
            realm_id: identity.realmId,
            realm_name: identity.realmName,
        });
    }

    /**
     * Validate authorization request.
     *
     * @throws OAuth2Error
     *
     * @param req
     */
    async validateWithRequest(
        req: Request,
    ) : Promise<OAuth2AuthorizationCodeRequest> {
        return this.requestValidator.run(req, {
            locations: ['body', 'query'],
        });
    }
}
