/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2DeviceAuthorizationResponse } from '@authup/core-http-kit';
import { OAuth2RequestError, OAuth2ServerError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import {
    DContext,
    DController,
    DPost,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { assertClientGrantAllowed } from '../../../../../core/index.ts';
import type {
    IOAuth2DeviceAuthorizationService,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import {
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
    readStringField,
} from '../../../adapters/index.ts';
import type { CertificateSource } from '../../../request/index.ts';
import type { DeviceAuthorizationControllerContext } from './types.ts';

const SCOPE_MAX_LENGTH = 512;

@DTags('auth')
@DController('/device_authorization')
export class DeviceAuthorizationController {
    protected service : IOAuth2DeviceAuthorizationService;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected certificateSource : CertificateSource;

    constructor(ctx: DeviceAuthorizationControllerContext) {
        this.service = ctx.service;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.certificateSource = ctx.certificateSource;
    }

    /**
     * RFC 8628 §3.1: the device asks for a device_code / user_code pair. A
     * confidential client authenticates here as it does at the token
     * endpoint; a public one identifies by client_id alone.
     */
    @DPost('', [])
    async request(@DContext() event: IAppEvent) : Promise<OAuth2DeviceAuthorizationResponse> {
        const body = await readRequestBody(event);
        const query = useRequestQuery(event);

        const scope = readStringField(body, 'scope');
        if (scope && scope.length > SCOPE_MAX_LENGTH) {
            throw OAuth2RequestError.malformed(`scope must not exceed ${SCOPE_MAX_LENGTH} characters.`);
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const realm = await this.realmRepository.resolve(readRealmHint(body, query), true);
        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);

        const client = await this.clientAuthenticator.authenticate(
            clientId,
            clientSecret,
            realm.id,
            certificateEvidence,
        );

        assertClientGrantAllowed(client, OAuth2TokenGrant.DEVICE_CODE);

        // A UUID-identified client may sit outside the hinted realm, and the
        // realm relation is not guaranteed loaded on the authenticated client.
        const clientRealm = realm.id === client.realmId ?
            realm :
            await this.realmRepository.resolve(client.realmId);
        if (!clientRealm) {
            throw new OAuth2ServerError();
        }

        event.response.headers.set('cache-control', 'no-store');

        return this.service.issue(client, clientRealm, { scope });
    }
}
