/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestBody } from '@routup/body';
import { check, validationResult } from 'express-validator';
import {
    IdentityProviderProtocol,
    IdentityProviderProtocolConfig,
    isRealmResourceWritable,
    isValidIdentityProviderSub,
} from '@authup/common';
import { BadRequestError } from '@ebec/http';
import { Request } from 'routup';
import {
    IdentityProviderEntity,
    RealmEntity,
    extractLdapIdentityProviderProtocolAttributes,
    extractOAuth2IdentityProviderProtocolAttributes,
    extractOidcConnectIdentityProviderProtocolAttributes,
    validateLdapIdentityProviderProtocol,
    validateOAuth2IdentityProviderProtocol, validateOidcIdentityProviderProtocol,
} from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';

export async function runOauth2ProviderValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
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
        .isIn(Object.values(IdentityProviderProtocolConfig))
        .optional({ nullable: true })
        .run(req);

    await check('enabled')
        .exists()
        .notEmpty()
        .isBoolean()
        .run(req);

    if (operation === CRUDOperation.CREATE) {
        await check('realm_id')
            .exists()
            .notEmpty()
            .isString()
            .run(req);
    }

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    switch (result.data.protocol) {
        case IdentityProviderProtocol.OAUTH2: {
            result.meta.attributes = validateOAuth2IdentityProviderProtocol(
                extractOAuth2IdentityProviderProtocolAttributes(useRequestBody(req)),
            );
            break;
        }
        case IdentityProviderProtocol.OIDC: {
            result.meta.attributes = validateOidcIdentityProviderProtocol(
                extractOidcConnectIdentityProviderProtocolAttributes(useRequestBody(req)),
            );
            break;
        }
        case IdentityProviderProtocol.LDAP: {
            result.meta.attributes = validateLdapIdentityProviderProtocol(
                extractLdapIdentityProviderProtocolAttributes(useRequestBody(req)),
            );
            break;
        }
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (result.relation.realm) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realmId'), result.relation.realm.id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    if (
        operation === CRUDOperation.CREATE &&
        !result.data.realm_id
    ) {
        result.data.realm_id = useRequestEnv(req, 'realmId');
    }

    return result;
}
