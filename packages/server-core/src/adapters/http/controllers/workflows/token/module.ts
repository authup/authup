/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Error,
    OAuth2TokenGrant,
    OAuth2TokenGrantResponse,
    type OAuth2TokenIntrospectionResponse,
} from '@authup/specs';
import {
    DController, DGet, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import {
    Request, Response, getRequestHostName, sendAccepted,
} from 'routup';
import { SerializeOptions, setResponseCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';
import { useDataSource } from 'typeorm-extension';
import { pickRecord } from '@authup/kit';
import { toOAuth2Error } from '../../../../../core/oauth2/helpers';
import { TokenControllerContext } from './types';
import {
    IIdentityResolver,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
    OAuth2OpenIDClaimsBuilder,
} from '../../../../../core';
import {
    HTTPClientCredentialsGrant,
    HTTPOAuth2AuthorizeGrant,
    HTTPOAuth2RefreshTokenGrant,
    HTTPPasswordGrant,
    HTTPRobotCredentialsGrant,
    IHTTPGrant,
    guessOauth2GrantTypeByRequest,
} from '../../../adapters';
import { extractTokenFromRequest } from './utils';
import { IdentityPermissionService } from '../../../../../services';

@DTags('auth')
@DController('/token')
export class TokenController {
    protected cookieDomain: string | undefined;

    protected refreshTokenIssuer: IOAuth2TokenIssuer;

    protected accessTokenIssuer: IOAuth2TokenIssuer;

    protected tokenVerifier: IOAuth2TokenVerifier;

    protected tokenRevoker: IOAuth2TokenRevoker;

    protected identityResolver : IIdentityResolver;

    protected tokenGrants : Record<`${OAuth2TokenGrant}`, IHTTPGrant>;

    // -------------------------------------------

    constructor(ctx: TokenControllerContext) {
        this.cookieDomain = ctx.cookieDomain;
        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
        this.identityResolver = ctx.identityResolver;

        this.tokenGrants = {
            [OAuth2TokenGrant.AUTHORIZATION_CODE]: new HTTPOAuth2AuthorizeGrant({
                codeVerifier: ctx.codeVerifier,
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
            }),
            [OAuth2TokenGrant.CLIENT_CREDENTIALS]: new HTTPClientCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                identityResolver: ctx.identityResolver,
            }),
            [OAuth2TokenGrant.ROBOT_CREDENTIALS]: new HTTPRobotCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                identityResolver: ctx.identityResolver,
            }),
            [OAuth2TokenGrant.PASSWORD]: new HTTPPasswordGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                identityResolver: ctx.identityResolver,
            }),
            [OAuth2TokenGrant.REFRESH_TOKEN]: new HTTPOAuth2RefreshTokenGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                tokenVerifier: ctx.tokenVerifier,
                tokenRevoker: ctx.tokenRevoker,
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
            const dataSource = await useDataSource();
            const identityPermissionService = new IdentityPermissionService(dataSource);

            // todo: only receive client specific permissions
            const permissions = await identityPermissionService.getFor({
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

            return {
                active: await this.tokenVerifier.isActive(payload.jti),
                // todo: permissions property should be removed.
                permissions: permissions.map((permission) => pickRecord(permission, ['name', 'client_id', 'realm_id'])),
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
            @DResponse() res: Response,
    ): Promise<OAuth2TokenGrantResponse> {
        const grantType = guessOauth2GrantTypeByRequest(req);
        const grant = this.tokenGrants[grantType];
        if (!grant) {
            throw OAuth2Error.grantInvalid();
        }

        const grantResponse = await grant.runWithRequest(req);

        const cookieOptions : SerializeOptions = {};
        if (this.cookieDomain) {
            cookieOptions.domain = this.cookieDomain;
        } else {
            cookieOptions.domain = getRequestHostName(req, {
                trustProxy: true,
            });
        }

        setResponseCookie(
            res,
            CookieName.ACCESS_TOKEN,
            grantResponse.access_token,
            {
                ...cookieOptions,
                maxAge: grantResponse.expires_in * 1_000,
            },
        );

        if (
            grantResponse.refresh_token &&
            grantResponse.refresh_token_expires_in
        ) {
            setResponseCookie(
                res,
                CookieName.REFRESH_TOKEN,
                grantResponse.refresh_token,
                {
                    ...cookieOptions,
                    maxAge: grantResponse.refresh_token_expires_in * 1_000,
                },
            );
        }

        return grantResponse;
    }
}
