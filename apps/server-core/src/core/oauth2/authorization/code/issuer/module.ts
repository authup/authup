/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { OAuth2RequestError } from '@authup/specs';
import type { IOAuth2AuthorizationCodeRepository, OAuth2AuthorizationCodeInput } from '../repository/index.ts';
import type { IOAuth2AuthorizationCodeIssuer, OAuth2AuthorizationCodeIssuerOptions } from './types.ts';

export class OAuth2AuthorizationCodeIssuer implements IOAuth2AuthorizationCodeIssuer {
    protected repository: IOAuth2AuthorizationCodeRepository;

    protected options: OAuth2AuthorizationCodeIssuerOptions;

    constructor(
        repository: IOAuth2AuthorizationCodeRepository,
        options: OAuth2AuthorizationCodeIssuerOptions = {},
    ) {
        this.repository = repository;
        this.options = options;
    }

    async issue(
        input: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationCodeIssuerOptions = {},
    ) : Promise<OAuth2AuthorizationCode> {
        // The code carries the identity's realm id + name. A dangling realm
        // relation (realm row deleted without cascade) must fail closed as a
        // clean OAuth2 error — never a TypeError → 500.
        const { realm } = identity.data;
        if (!realm) {
            throw OAuth2RequestError.identityInvalid();
        }

        const entity: OAuth2AuthorizationCodeInput = {
            redirect_uri: input.redirect_uri,
            client_id: input.client_id,
            scope: input.scope,
            nonce: input.nonce,
            code_challenge: input.code_challenge,
            code_challenge_method: input.code_challenge_method,
            acr_values: input.acr_values ?? null,

            auth_time: options.authTime ?? Math.floor(Date.now() / 1000),
            auth_method: options.authMethod ?? null,

            realm_id: realm.id,
            realm_name: realm.name,
            sub: identity.data.id,
            sub_kind: identity.type,
        };

        if (options.sessionId) {
            entity.session_id = options.sessionId;
        }

        return this.repository.save(entity, { maxAge: options.maxAge ?? this.options.maxAge });
    }
}
