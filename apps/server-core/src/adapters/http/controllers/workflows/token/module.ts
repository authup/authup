/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse,OAuth2TokenIntrospectionResponse,OAuth2TokenPermission } from '@authup/specs';
import { OAuth2Error, OAuth2TokenGrant } from '@authup/specs';
import {
    DController, 
    DGet, 
    DPost, 
    DRequest, 
    DResponse, 
    DTags,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { buildPermissionBindingKey } from '@authup/core-kit';
import { toOAuth2Error } from '../../../../../core/oauth2/helpers/index.ts';
import type { TokenControllerContext } from './types.ts';
import type {
    IIdentityPermissionProvider,
    IIdentityResolver,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker, 
    IOAuth2TokenVerifier 
} from '../../../../../core/index.ts';
import { OAuth2OpenIDClaimsBuilder, } from '../../../../../core/index.ts';
import type { IHTTPOAuth2Grant } from '../../../adapters/index.ts';
import {
    HTTPClientCredentialsGrant,
    HTTPOAuth2AuthorizeGrant,
    HTTPOAuth2RefreshTokenGrant,
    HTTPPasswordGrant,
    HTTPRobotCredentialsGrant,
    guessOauth2GrantTypeByRequest,
} from '../../../adapters/index.ts';
import { extractTokenFromRequest } from './utils/index.ts';

@DTags('auth')
@DController('/token')
export class TokenController {
    protected refreshTokenIssuer: IOAuth2TokenIssuer;

    protected accessTokenIssuer: IOAuth2TokenIssuer;

    protected tokenVerifier: IOAuth2TokenVerifier;

    protected tokenRevoker: IOAuth2TokenRevoker;

    protected identityResolver : IIdentityResolver;

    protected identityPermissionProvider : IIdentityPermissionProvider;

    protected tokenGrants : Record<`${OAuth2TokenGrant}`, IHTTPOAuth2Grant>;

    // -------------------------------------------

    constructor(ctx: TokenControllerContext) {
        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
        this.identityResolver = ctx.identityResolver;
        this.identityPermissionProvider = ctx.identityPermissionProvider;

        this.tokenGrants = {
            [OAuth2TokenGrant.AUTHORIZATION_CODE]: new HTTPOAuth2AuthorizeGrant({
                codeVerifier: ctx.codeVerifier,
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                sessionManager: ctx.sessionManager,
            }),
            [OAuth2TokenGrant.CLIENT_CREDENTIALS]: new HTTPClientCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                authenticator: ctx.clientAuthenticator,
                sessionManager: ctx.sessionManager,
            }),
            [OAuth2TokenGrant.ROBOT_CREDENTIALS]: new HTTPRobotCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                authenticator: ctx.robotAuthenticator,
                sessionManager: ctx.sessionManager,
            }),
            [OAuth2TokenGrant.PASSWORD]: new HTTPPasswordGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                authenticator: ctx.userAuthenticator,
                sessionManager: ctx.sessionManager,
            }),
            [OAuth2TokenGrant.REFRESH_TOKEN]: new HTTPOAuth2RefreshTokenGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                tokenVerifier: ctx.tokenVerifier,
                tokenRevoker: ctx.tokenRevoker,
                sessionManager: ctx.sessionManager,
            }),
        };
    }

    // -------------------------------------------

    @DGet('/introspect', [])
    async getIntrospect(
        @DRequest() req: Request,
    ): Promise<OAuth2TokenIntrospectionResponse> {
        return this.postIntrospect(req);
    }

    @DPost('/introspect', [])
    async postIntrospect(
        @DRequest() req: Request,
    ): Promise<OAuth2TokenIntrospectionResponse> {
        try {
            const token = await extractTokenFromRequest(req);
            const payload = await this.tokenVerifier.verify(token, {
                skipActiveCheck: true,
            });
            if (!payload.sub || !payload.sub_kind) {
                throw OAuth2Error.identityInvalid();
            }

            // todo: only receive client specific permissions
            const permissions = await this.identityPermissionProvider.getFor({
                id: payload.sub,
                type: payload.sub_kind,
                clientId: payload.client_id,
                realmId: payload.realm_id,
            });

            const identity = await this.identityResolver.resolve(payload.sub_kind, payload.sub);
            if (!identity) {
                // todo: differentiate between client, robot & user
                throw OAuth2Error.identityInvalid();
            }

            const claimsBuilder = new OAuth2OpenIDClaimsBuilder();
            const claims = claimsBuilder.fromIdentity(identity);

            let active : boolean;
            if (payload.jti) {
                const isInactive = await this.tokenVerifier.isInactive(payload.jti);
                active = !isInactive;
            } else {
                active = false;
            }

            return {
                active,
                // todo: permissions property should be removed.
                permissions: Object.values(
                    permissions.reduce((acc, binding) => {
                        const key = buildPermissionBindingKey(binding.permission);
                        if (!acc[key]) {
                            acc[key] = {
                                name: binding.permission.name,
                                client_id: binding.permission.client_id,
                                realm_id: binding.permission.realm_id,
                            } as OAuth2TokenPermission;
                        }
                        return acc;
                    }, {} as Record<string, OAuth2TokenPermission>),
                ),
                ...payload,
                ...claims,
            };
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('/revoke', [])
    async revokeToken(
        @DRequest() req: Request,
        @DResponse() res: Response,
    ) {
        try {
            const token = await extractTokenFromRequest(req);

            const payload = await this.tokenVerifier.verify(token);

            await this.tokenRevoker.revoke(payload);

            return await sendAccepted(res);
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('', [])
    async createToken(
        @DRequest() req: Request,
    ): Promise<OAuth2TokenGrantResponse> {
        const grantType = guessOauth2GrantTypeByRequest(req);
        if (!grantType) {
            throw OAuth2Error.grantInvalid();
        }

        const grant = this.tokenGrants[grantType];
        if (!grant) {
            throw OAuth2Error.grantInvalid();
        }

        return grant.runWithRequest(req);
    }
}
