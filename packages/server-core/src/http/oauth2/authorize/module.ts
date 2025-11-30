/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import {
    isSimpleMatch,
} from '@authup/kit';
import type { OAuth2SubKind } from '@authup/specs';
import { OAuth2AuthorizationResponseType, OAuth2Error, hasOAuth2Scopes } from '@authup/specs';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientScopeEntity } from '../../../database/domains';
import { ClientAuthenticationService } from '../../../services';
import { useRequestIdentityOrFail } from '../../request';
import { getOauth2AuthorizeResponseTypesByRequest } from '../response';
import type { OAuth2AccessTokenBuildContext } from '../token';
import {
    OAuth2TokenManager, buildOAuth2AccessTokenPayload, buildOpenIdTokenPayload, extendOpenIdTokenPayload,
} from '../token';
import { OAuth2AuthorizationCodeRepository } from './repository';
import type {
    OAuth2AuthorizationCodeRequestContainer,
    OAuth2AuthorizationManagerOptions,
    OAuth2AuthorizationResult,
} from './types';
import { AuthorizeRequestValidator } from './validation';

export class OAuth2AuthorizationManager {
    protected options: OAuth2AuthorizationManagerOptions;

    protected codeRepository : OAuth2AuthorizationCodeRepository;

    protected tokenManager : OAuth2TokenManager;

    protected validator : AuthorizeRequestValidator;

    protected validatorAdapter : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    constructor(options: OAuth2AuthorizationManagerOptions) {
        this.options = options;

        this.codeRepository = new OAuth2AuthorizationCodeRepository();
        this.tokenManager = new OAuth2TokenManager();

        this.validator = new AuthorizeRequestValidator();
        this.validatorAdapter = new RoutupContainerAdapter(this.validator);
    }

    async executeWithRequest(req: Request) {
        const { data } = await this.validateWithRequest(req);

        const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        const identity = useRequestIdentityOrFail(req);

        const tokenBuildContext : OAuth2AccessTokenBuildContext = {
            issuer: this.options.issuer,
            remoteAddress: getRequestIP(req, { trustProxy: true }),
            sub: identity.id,
            subKind: identity.type as `${OAuth2SubKind}`,
            realmId: identity.realmId,
            realmName: identity.realmName,
            clientId: data.client_id,
            ...(data.scope ? { scope: data.scope } : {}),
        };

        let idToken : string | undefined;
        if (
            responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
            (
                data.scope &&
                hasOAuth2Scopes(data.scope, ScopeName.OPEN_ID)
            )
        ) {
            tokenBuildContext.maxAge = this.options.idTokenMaxAge;

            const signingResult = await this.tokenManager.sign(
                await extendOpenIdTokenPayload(buildOpenIdTokenPayload(tokenBuildContext)),
            );

            idToken = signingResult.token;

            if (responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
                output.idToken = signingResult.token;
            }
        }

        if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
            tokenBuildContext.maxAge = this.options.accessTokenMaxAge;

            const signingResult = await this.tokenManager.sign(
                buildOAuth2AccessTokenPayload(tokenBuildContext),
            );

            output.accessToken = signingResult.token;
        }

        if (responseTypes[OAuth2AuthorizationResponseType.CODE]) {
            const entity: OAuth2AuthorizationCode = {
                id: randomBytes(10).toString('hex'),
                redirect_uri: data.redirect_uri,
                client_id: data.client_id,
                realm_id: identity.realmId,
                realm_name: identity.realmName,
                scope: data.scope,
                code_challenge: data.code_challenge,
                code_challenge_method: data.code_challenge_method,
            };

            if (identity.type === 'user') {
                entity.user_id = identity.id;
            }

            if (identity.type === 'robot') {
                entity.robot_id = identity.id;
            }

            if (idToken) {
                entity.id_token = idToken;
            }

            await this.codeRepository.set(entity, 1000 * this.options.authorizationCodeMaxAge);

            output.authorizationCode = entity.id;
        }

        return output;
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
    ) : Promise<OAuth2AuthorizationCodeRequestContainer> {
        const data = await this.validatorAdapter.run(req, {
            locations: ['body', 'query'],
        });

        return this.postValidation(data);
    }

    /**
     * Validate raw authorization data.
     *
     * @param input
     */
    async validate(input: Record<string, any>) : Promise<OAuth2AuthorizationCodeRequestContainer> {
        const data = await this.validator.run(input);
        return this.postValidation(data);
    }

    protected async postValidation(data: OAuth2AuthorizationCodeRequest) : Promise<OAuth2AuthorizationCodeRequestContainer> {
        const authenticationService = new ClientAuthenticationService();

        const client = await authenticationService.resolve(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        data.realm_id = client.realm_id;

        // verifying scopes
        const dataSource = await useDataSource();
        const clientScopeRepository = dataSource.getRepository(ClientScopeEntity);
        const clientScopes = await clientScopeRepository.find({
            where: {
                client_id: client.id,
            },
            relations: {
                scope: true,
            },
        });

        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);
        if (data.scope) {
            if (
                !hasOAuth2Scopes(scopeNames, data.scope) &&
                !hasOAuth2Scopes(data.scope, ScopeName.GLOBAL)
            ) {
                throw OAuth2Error.scopeInsufficient();
            }
        } else {
            data.scope = scopeNames.join(' ');
        }

        if (client.redirect_uri) {
            const redirectUris = client.redirect_uri.split(',');

            // verifying scopes
            if (!isSimpleMatch(data.redirect_uri, redirectUris)) {
                throw OAuth2Error.redirectUriMismatch();
            }
        }

        return {
            data,
            client,
            clientScopes,
        };
    }
}
