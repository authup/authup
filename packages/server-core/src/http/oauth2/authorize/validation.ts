/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    OAuth2AuthorizationResponseType,
    TokenError,
} from '@authup/kit';
import {
    isOAuth2ScopeAllowed,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { createValidator } from '@validup/adapter-validator';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { Container } from 'validup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientEntity, ClientScopeEntity } from '../../../domains';

type AuthorizeValidationResult = OAuth2AuthorizationCodeRequest & {
    client_id: string
};

export class AuthorizeRequestValidator extends Container<AuthorizeValidationResult> {
    constructor() {
        super();

        this.mount('response_type', createValidator((chain) => chain
            .exists()
            .isString()
            .notEmpty()
            .custom((value) => {
                const availableResponseTypes = Object.values(OAuth2AuthorizationResponseType);
                const responseTypes = value.split(' ');

                for (let i = 0; i < responseTypes.length; i++) {
                    if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                        throw TokenError.responseTypeUnsupported();
                    }
                }

                return true;
            })));

        this.mount('redirect_uri', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isURL()
            .isLength({ min: 3, max: 2000 })));

        this.mount('scope', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })));

        this.mount('state', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 2048 })
            .optional({ nullable: true })));

        this.mount('client_id', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isUUID()));
    }
}

export async function validateAuthorizeRequest(
    req: Request,
) : Promise<AuthorizeValidationResult> {
    const validator = new AuthorizeRequestValidator();
    const validatorWrapper = new RoutupContainerAdapter(validator);
    const data = await validatorWrapper.run(req);

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
