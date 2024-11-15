/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { hasOAuth2OpenIDScope, isOAuth2ScopeAllowed } from '@authup/core-kit';
import type { OAuth2SubKind } from '@authup/kit';
import { OAuth2AuthorizationResponseType } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientEntity, ClientScopeEntity } from '../../../database/domains';
import { useRequestIdentityOrFail } from '../../request';
import { getOauth2AuthorizeResponseTypesByRequest } from '../response';
import type { OAuth2AccessTokenBuildContext, OAuth2OpenIdTokenBuildContext } from '../token';
import {
    OAuth2TokenManager, buildOAuth2AccessTokenPayload, buildOpenIdTokenPayload, extendOpenIdTokenPayload,
} from '../token';
import { OAuth2AuthorizationCodeRepository } from './repository';
import type { OAuth2AuthorizationResult, OAuth2AuthorizationServiceOptions } from './types';
import { AuthorizeRequestValidator } from './validation';

export class OAuth2AuthorizationService {
    protected options: OAuth2AuthorizationServiceOptions;

    protected codeRepository : OAuth2AuthorizationCodeRepository;

    protected tokenManager : OAuth2TokenManager;

    protected validatorAdapter : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    constructor(options: OAuth2AuthorizationServiceOptions) {
        this.options = options;

        this.codeRepository = new OAuth2AuthorizationCodeRepository();
        this.tokenManager = new OAuth2TokenManager();

        const validator = new AuthorizeRequestValidator();
        this.validatorAdapter = new RoutupContainerAdapter(validator);
    }

    async execute(req: Request) {
        const data = await this.validate(req);

        const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        const identity = useRequestIdentityOrFail(req);

        const tokenBuildContext : OAuth2AccessTokenBuildContext | OAuth2OpenIdTokenBuildContext = {
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
            hasOAuth2OpenIDScope(data.scope)
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
                user_id: null,
                robot_id: null,
                id_token: null,
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

    protected async validate(
        req: Request,
    ) : Promise<OAuth2AuthorizationCodeRequest> {
        const data = await this.validatorAdapter.run(req);

        const dataSource = await useDataSource();
        const clientRepository = dataSource.getRepository(ClientEntity);
        const client = await clientRepository.findOneBy({ id: data.client_id });
        if (!client) {
            throw new BadRequestError('The referenced client does not exist.');
        }

        const clientScopeRepository = dataSource.getRepository(ClientScopeEntity);
        const clientScopes = await clientScopeRepository.find({
            where: {
                client_id: data.client_id,
            },
            relations: {
                scope: true,
            },
        });

        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);
        if (data.scope) {
            if (!isOAuth2ScopeAllowed(scopeNames, data.scope)) {
                throw new BadRequestError('The requested scope is not covered by the client scope.');
            }
        }

        if (!data.scope) {
            data.scope = scopeNames.join(' ');
        }

        return data;
    }
}
