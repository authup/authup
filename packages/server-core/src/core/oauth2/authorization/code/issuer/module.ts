/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IOAuth2AuthorizationCodeRepository, OAuth2AuthorizationCodeInput } from '../repository';
import type { IOAuth2AuthorizationCodeIssuer, OAuth2AuthorizationCodeIssuerOptions } from './types';

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
        const entity: OAuth2AuthorizationCodeInput = {
            redirect_uri: input.redirect_uri,
            client_id: input.client_id,
            scope: input.scope,
            code_challenge: input.code_challenge,
            code_challenge_method: input.code_challenge_method,

            realm_id: identity.data.realm.id,
            realm_name: identity.data.realm.name,
            sub: identity.data.id,
            sub_kind: identity.type,
        };

        if (options.idToken) {
            entity.id_token = options.idToken;
        }

        return this.repository.save(entity, {
            maxAge: options.maxAge ?? this.options.maxAge,
        });
    }
}
