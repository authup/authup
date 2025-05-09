/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { hasOAuth2OpenIDScope, isOAuth2ScopeAllowed } from '@authup/core-kit';
import {
    base64URLDecode, createNanoID, isSimpleMatch,
} from '@authup/kit';
import type { Cache } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import type { OAuth2SubKind } from '@authup/specs';
import { OAuth2AuthorizationResponseType, OAuth2Error } from '@authup/specs';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientEntity, ClientScopeEntity } from '../../../database/domains';
import { useRequestIdentityOrFail } from '../../request';
import { OAuth2CachePrefix } from '../constants';
import { getOauth2AuthorizeResponseTypesByRequest } from '../response';
import type { OAuth2AccessTokenBuildContext, OAuth2OpenIdTokenBuildContext } from '../token';
import {
    OAuth2TokenManager, buildOAuth2AccessTokenPayload, buildOpenIdTokenPayload, extendOpenIdTokenPayload,
} from '../token';
import { OAuth2AuthorizationCodeRepository } from './repository';
import type { OAuth2AuthorizationCodeRequestExtended, OAuth2AuthorizationManagerOptions, OAuth2AuthorizationResult } from './types';
import { AuthorizeRequestValidator } from './validation';

export class OAuth2AuthorizationManager {
    protected options: OAuth2AuthorizationManagerOptions;

    protected cache : Cache;

    protected codeRepository : OAuth2AuthorizationCodeRepository;

    protected tokenManager : OAuth2TokenManager;

    protected validatorAdapter : RoutupContainerAdapter<OAuth2AuthorizationCodeRequestExtended>;

    constructor(options: OAuth2AuthorizationManagerOptions) {
        this.options = options;

        this.cache = useCache();

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
    async validate(
        req: Request,
    ) : Promise<OAuth2AuthorizationCodeRequestExtended> {
        const data = await this.validatorAdapter.run(req, {
            locations: ['body', 'query'],
        });

        const dataSource = await useDataSource();
        const clientRepository = dataSource.getRepository(ClientEntity);
        // todo: maybe id or (name + realm_id), realm_id can be realm.name or realm.id ?!
        const client = await clientRepository.findOneBy({ id: data.client_id });
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        data.client = client;
        data.realm_id = client.realm_id;

        // verifying scopes
        const clientScopeRepository = dataSource.getRepository(ClientScopeEntity);
        const clientScopes = await clientScopeRepository.find({
            where: {
                client_id: data.client_id,
            },
            relations: {
                scope: true,
            },
        });

        data.clientScopes = clientScopes;

        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);
        if (data.scope) {
            if (!isOAuth2ScopeAllowed(scopeNames, data.scope)) {
                throw OAuth2Error.scopeInsufficient();
            }
        } else {
            data.scope = scopeNames.join(' ');
        }

        const redirectUris = client.redirect_uri.split(',');

        // verifying scopes
        if (!isSimpleMatch(data.redirect_uri, redirectUris)) {
            throw OAuth2Error.redirectUriMismatch();
        }

        return data;
    }

    decodeCodeRequest(input: string) : OAuth2AuthorizationCodeRequest {
        try {
            return JSON.parse(base64URLDecode(input));
        } catch (e) {
            throw OAuth2Error.requestInvalid('The code request is malformed.');
        }
    }

    extractCodeRequest(req: Request) : string | undefined {
        const query = useRequestQuery(req);
        if (typeof query.codeRequest !== 'string') {
            return undefined;
        }

        return query.codeRequest;
    }

    async createState(req: Request, data: Record<string, any> = {}) : Promise<string> {
        const state = createNanoID();
        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        const userAgent = getRequestHeader(req, 'user-agent');

        await this.cache.set(
            buildCacheKey({ prefix: OAuth2CachePrefix.AUTHORIZATION_CODE, key: state }),
            {
                ip,
                userAgent,
                data,
            },
            {
                ttl: 1000 * 60 * 30, // 30 min
            },
        );

        return state;
    }

    async verifyState<T extends Record<string, any>>(req: Request) : Promise<T> {
        const query = useRequestQuery(req);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        const cacheKey = buildCacheKey({ prefix: OAuth2CachePrefix.AUTHORIZATION_CODE, key: query.state });
        const cached : {
            ip?: string,
            userAgent?: string,
            data: T,
        } = await this.cache.get(cacheKey);
        if (!cached) {
            throw OAuth2Error.stateInvalid();
        }

        // avoid replay attack :)
        await this.cache.drop(cacheKey);

        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        if (ip !== cached.ip) {
            throw OAuth2Error.stateInvalid();
        }

        const userAgent = getRequestHeader(req, 'user-agent');
        if (userAgent !== cached.userAgent) {
            throw OAuth2Error.stateInvalid();
        }

        return cached.data;
    }
}
