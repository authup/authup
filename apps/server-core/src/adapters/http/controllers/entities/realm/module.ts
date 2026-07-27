/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DPut,
    DTags,
} from '@routup/decorators';
import type { OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import { OAuth2AuthenticationContextClass, OAuth2AuthorizationPrompt, OAuth2AuthorizationResponseType } from '@authup/specs';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { Repository } from 'typeorm';
import type {
    EntityCollectionResponse,
    EntityRecordWrappedResponse,
    RealmCreatePayload,
    RealmSavePayload,
    RealmUpdatePayload,
} from '@authup/core-http-kit';
import type { Realm } from '@authup/core-kit';
import type { IRealmService } from '../../../../../core/index.ts';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getJwkRouteHandler, getJwksRouteHandler } from '../../workflows/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';
import { resolveURL } from '../../../../../utils/index.ts';

export type RealmControllerOptions = {
    baseURL: string,
    mtlsBaseURL?: string | null,
    clientCertificatesEnabled?: boolean,
};

export type RealmControllerContext = {
    options: RealmControllerOptions,
    service: IRealmService,
    keyRepository: Repository<KeyEntity>,
};

@DTags('realm')
@DController('/realms')
export class RealmController {
    protected options: RealmControllerOptions;

    protected service: IRealmService;

    protected keyRepository: Repository<KeyEntity>;

    constructor(ctx: RealmControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
        this.keyRepository = ctx.keyRepository;
    }

    @DGet('', [])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Realm>> {
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event));

        return {
            data,
            meta,
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: RealmCreatePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordWrappedResponse<Realm>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DGet('/:id', [])
    async get(@DPath('id') id: string): Promise<EntityRecordWrappedResponse<Realm>> {
        const entity = await this.service.getOne(id);

        return { data: entity, meta: {} };
    }

    @DGet('/:id/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DPath('id') id: string,
    ): Promise<OpenIDProviderMetadata> {
        const entity = await this.service.getOne(id);

        const { baseURL } = this.options;
        const { mtlsBaseURL, clientCertificatesEnabled = false } = this.options;

        return {
            issuer: resolveURL(baseURL, `realms/${entity.name}`).replace(/\/+$/, ''),

            authorization_endpoint: resolveURL(baseURL, 'authorize'),

            end_session_endpoint: resolveURL(baseURL, 'logout'),

            jwks_uri: resolveURL(baseURL, `realms/${entity.name}/jwks`),

            // OAuth 2.1 posture: the authorization endpoint issues codes
            // only — implicit/hybrid response types were dropped (plan 042).
            response_types_supported: [
                OAuth2AuthorizationResponseType.CODE,
            ],

            // `none` (silent authentication) is handled by the hosted SSR
            // authorize page (the kit `Authorize.vue`): it either completes a
            // built_in client's auto-consent silently or redirects the OIDC
            // error (login_required / consent_required / interaction_required)
            // to a verified redirect_uri — zero UI. The server GET cannot do
            // this server-side (auth is header-only; a top-level navigation
            // carries no bearer), so the SSR page owns it (plan 042 item 10).
            prompt_values_supported: [
                OAuth2AuthorizationPrompt.NONE,
                OAuth2AuthorizationPrompt.LOGIN,
                OAuth2AuthorizationPrompt.CONSENT,
                OAuth2AuthorizationPrompt.SELECT_ACCOUNT,
            ],

            // two coarse levels only (urn-style — OIDC reserves the bare
            // "0"); `urn:authup:mfa` in `acr_values` acts as a step-up
            // trigger (plan 050).
            acr_values_supported: [
                OAuth2AuthenticationContextClass.PASSWORD,
                OAuth2AuthenticationContextClass.MFA,
            ],

            subject_types_supported: [
                'public',
            ],

            id_token_signing_alg_values_supported: [
                'HS256',
                'HS384',
                'HS512',
                'RS256',
                'RS384',
                'RS512',
                'none',
            ],

            token_endpoint: resolveURL(baseURL, 'token'),

            token_endpoint_auth_methods_supported: [
                'none',
                'client_secret_basic',
                'client_secret_post',
                ...(clientCertificatesEnabled ? ['tls_client_auth'] : []),
            ],

            ...(clientCertificatesEnabled ? { tls_client_certificate_bound_access_tokens: true } : {}),

            ...(mtlsBaseURL ? {
                mtls_endpoint_aliases: {
                    token_endpoint: resolveURL(mtlsBaseURL, 'token'),
                    introspection_endpoint: resolveURL(mtlsBaseURL, 'token/introspect'),
                    revocation_endpoint: resolveURL(mtlsBaseURL, 'token/revoke'),
                    userinfo_endpoint: resolveURL(mtlsBaseURL, 'userinfo'),
                },
            } : {}),

            introspection_endpoint: resolveURL(baseURL, 'token/introspect'),

            revocation_endpoint: resolveURL(baseURL, 'token/revoke'),

            // -----------------------------------------------------------

            service_documentation: 'https://authup.org/',

            userinfo_endpoint: resolveURL(baseURL, 'userinfo'),
        };
    }

    @DGet('/:id/jwks', [])
    async getCerts(@DPath('id') id: string): Promise<{ keys: OAuth2JsonWebKey[] }> {
        const entity = await this.service.getOne(id);
        return getJwksRouteHandler(this.keyRepository, entity.id);
    }

    @DGet('/:id/jwks/:keyId', [])
    async getCert(
        @DPath('id') id: string,
        @DPath('keyId') keyId: string,
    ): Promise<OAuth2JsonWebKey> {
        const entity = await this.service.getOne(id);
        return getJwkRouteHandler(this.keyRepository, keyId, entity.id);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: RealmUpdatePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordWrappedResponse<Realm>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: RealmSavePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordWrappedResponse<Realm>> {
        const actor = buildActorContext(event);
        const {
            entity,
            created,
        } = await this.service.save(
            id || undefined,
            data,
            actor,
        );

        event.response.status = created ? 201 : 202;
        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordWrappedResponse<Realm>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
