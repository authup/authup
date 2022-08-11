/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2IdentityProvider, OAuth2IdentityProviderBase, hasOwnProperty } from '@authelion/common';
import validator from 'validator';
import { ValidatorError } from '../../../../config';

export function validateOAuth2IdentityProviderProtocol<
    T extends Partial<OAuth2IdentityProviderBase>,
>(entity: T) : T {
    if (
        typeof entity.token_url !== 'string' ||
        !validator.isURL(entity.token_url)
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'token_url' });
    }

    if (
        hasOwnProperty(entity, 'token_revoke_url') &&
        (
            typeof entity.token_revoke_url !== 'string' ||
            !validator.isURL(entity.token_revoke_url)
        )
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'token_revoke_url' });
    }

    if (
        typeof entity.authorize_url !== 'string' ||
        !validator.isURL(entity.authorize_url)
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'authorize_url' });
    }

    if (
        hasOwnProperty(entity, 'user_info_url') &&
        (
            typeof entity.user_info_url !== 'string' ||
            !validator.isURL(entity.user_info_url)
        )
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'user_info_url' });
    }

    if (
        hasOwnProperty(entity, 'scope') &&
        (
            typeof entity.scope !== 'string' ||
            !validator.isLength(entity.scope, { min: 3, max: 2000 })
        )

    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'scope' });
    }

    if (
        typeof entity.client_id !== 'string' ||
        !validator.isLength(entity.client_id, { min: 3, max: 128 })
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'client_id' });
    }

    if (
        hasOwnProperty(entity, 'client_secret') &&
        (
            typeof entity.client_secret !== 'string' ||
            !validator.isLength(entity.client_secret, { min: 3, max: 128 })
        )
    ) {
        throw new ValidatorError<OAuth2IdentityProvider>({ key: 'client_secret' });
    }

    return entity;
}
