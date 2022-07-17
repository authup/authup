/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { OAuth2AuthorizationCodeResponseType, isOAuth2ScopeAllowed } from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../../express-validation';
import { AuthorizeValidationResult } from '../type';
import { ExpressRequest } from '../../../../type';
import { extendExpressValidationResultWithOAuth2Client } from '../../../oauth2-client';

export async function runAuthorizeValidation(
    req: ExpressRequest,
) : Promise<AuthorizeValidationResult> {
    const result : AuthorizeValidationResult = {
        data: {},
        meta: {},
    };

    // todo: accept space seperated response types ;)
    // accept multiple response types
    await check('response_type')
        .exists()
        .isIn(Object.values(OAuth2AuthorizationCodeResponseType))
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
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithOAuth2Client(result);

    if (
        result.meta.client &&
        result.data.scope
    ) {
        if (!isOAuth2ScopeAllowed(result.meta.client.scope, result.data.scope)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('scope'));
        }
    }

    return result;
}
