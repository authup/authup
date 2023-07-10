/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    IdentityProviderPreset,
    IdentityProviderProtocol, isPropertySet,
    isRealmResourceWritable,
    isValidIdentityProviderSub,
} from '@authup/core';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { IdentityProviderEntity } from '../../../../domains';
import {
    RealmEntity,
    validateLdapIdentityProviderProtocol,
    validateOAuth2IdentityProviderProtocol,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

export async function runOauth2ProviderValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<IdentityProviderEntity, {attributes: Record<string, any>}>> {
    const result : ExpressValidationResult<IdentityProviderEntity, {attributes: Record<string, any>}> = initExpressValidationResult();

    await check('slug')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 36 })
        .custom((value) => {
            const isValid = isValidIdentityProviderSub(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
            }

            return isValid;
        })
        .run(req);

    await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 128 })
        .run(req);

    await check('protocol')
        .exists()
        .notEmpty()
        .isIn(Object.values(IdentityProviderProtocol))
        .run(req);

    await check('protocol_config')
        .exists()
        .notEmpty()
        .isIn(Object.values(IdentityProviderPreset))
        .optional({ nullable: true })
        .run(req);

    await check('enabled')
        .exists()
        .notEmpty()
        .isBoolean()
        .run(req);

    await check('realm_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    try {
        switch (result.data.protocol) {
            case IdentityProviderProtocol.OAUTH2:
            case IdentityProviderProtocol.OIDC: {
                result.meta.attributes = validateOAuth2IdentityProviderProtocol(req, result.data.protocol_config);
                break;
            }
            case IdentityProviderProtocol.LDAP: {
                result.meta.attributes = validateLdapIdentityProviderProtocol(req);
                break;
            }
        }
    } catch (e) {
        if (e instanceof Error) {
            throw new BadRequestError(e.message, {
                previous: e,
            });
        }

        throw e;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (isPropertySet(result.data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.data.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
        }
    }

    if (
        operation === RequestHandlerOperation.CREATE &&
        !result.data.realm_id
    ) {
        const { id } = useRequestEnv(req, 'realm');
        result.data.realm_id = id;
    }

    return result;
}
