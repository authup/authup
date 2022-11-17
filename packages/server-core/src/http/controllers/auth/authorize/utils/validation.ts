/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    OAuth2AuthorizationCodeRequest,
    OAuth2AuthorizationResponseType,
    TokenError,
    isOAuth2ScopeAllowed,
} from '@authelion/common';
import { BadRequestError } from '@ebec/http';
import { Request } from 'routup';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../../validation';
import { OAuth2ClientEntity } from '../../../../../domains';

export async function runAuthorizeValidation(
    req: Request,
) : Promise<ExpressValidationResult<OAuth2AuthorizationCodeRequest & { client: OAuth2ClientEntity, client_id: string }>> {
    const result : ExpressValidationResult<OAuth2AuthorizationCodeRequest & {
        client: OAuth2ClientEntity, client_id: string
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
        .isIn(Object.values(OAuth2AuthorizationResponseType))
        .run(req);

    await check('redirect_uri')
        .exists()
        .notEmpty()
        .isURL()
        .isLength({ min: 3, max: 2000 })
        .optional({ nullable: true })
        .run(req);

    await check('scope')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
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

    await extendExpressValidationResultWithRelation(result, OAuth2ClientEntity, {
        id: 'client_id',
        entity: 'client',
    });

    if (
        result.relation.client &&
        result.data.scope
    ) {
        if (!isOAuth2ScopeAllowed(result.relation.client.scope, result.data.scope)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('scope'));
        }
    }

    return result;
}
