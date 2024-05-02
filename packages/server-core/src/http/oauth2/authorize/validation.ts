/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    OAuth2AuthorizationResponseType,
    TokenError,
} from '@authup/kit';
import {
    isOAuth2ScopeAllowed,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientEntity, ClientScopeEntity } from '../../../domains';
import type { ExpressValidationResult } from '../../validation';
import {
    RequestValidationError,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../validation';

export async function validateAuthorizeRequest(
    req: Request,
) : Promise<ExpressValidationResult<OAuth2AuthorizationCodeRequest & { client: ClientEntity, client_id: string }>> {
    const result : ExpressValidationResult<OAuth2AuthorizationCodeRequest & {
        client: ClientEntity, client_id: string
    }> = initExpressValidationResult();

    await check('response_type')
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
        })
        .run(req);

    await check('redirect_uri')
        .exists()
        .notEmpty()
        .isURL()
        .isLength({ min: 3, max: 2000 })
        .run(req);

    await check('scope')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .run(req);

    await check('state')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 2048 })
        .optional({ nullable: true })
        .run(req);

    await check('client_id')
        .exists()
        .notEmpty()
        .isString()
        .isUUID()
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, ClientEntity, {
        id: 'client_id',
        entity: 'client',
    });

    if (result.relation.client) {
        const dataSource = await useDataSource();
        const clientScopeRepository = dataSource.getRepository(ClientScopeEntity);
        const clientScopes = await clientScopeRepository.find({
            where: {
                client_id: result.data.client_id,
            },
            relations: {
                scope: true,
            },
        });

        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);

        if (result.data.scope) {
            if (!isOAuth2ScopeAllowed(scopeNames, result.data.scope)) {
                throw new BadRequestError('The requested scope is not covered by the client scope.');
            }
        }

        if (!result.data.scope) {
            result.data.scope = scopeNames.join(' ');
        }
    }

    return result;
}
