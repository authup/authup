/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCode, OAuth2AuthorizeCodeRequest } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import { randomBytes } from 'node:crypto';
import type { IOAuth2AuthorizationCodeRepository } from '../repository';
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
        input: OAuth2AuthorizeCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationCodeIssuerOptions = {},
    ) : Promise<OAuth2AuthorizationCode> {
        const entity: OAuth2AuthorizationCode = {
            id: randomBytes(10).toString('hex'),
            redirect_uri: input.redirect_uri,
            client_id: input.client_id,
            realm_id: input.realm_id,
            realm_name: identity.data.realm?.name, // todo: ensure this is set!
            scope: input.scope,
            code_challenge: input.code_challenge,
            code_challenge_method: input.code_challenge_method,
            max_age: options.maxAge || this.options.maxAge,
        };

        switch (identity.type) {
            case OAuth2SubKind.ROBOT: {
                entity.robot_id = identity.data.id;
                break;
            }
            case OAuth2SubKind.USER: {
                entity.user_id = identity.data.id;
                break;
            }
        }

        if (options.idToken) {
            entity.id_token = options.idToken;
        }

        await this.repository.save(entity);

        return entity;
    }
}
