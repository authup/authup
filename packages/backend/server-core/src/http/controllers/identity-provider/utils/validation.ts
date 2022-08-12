/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    IdentityProviderProtocol,
    IdentityProviderProtocolConfig,
    isPermittedForResourceRealm, isValidIdentityProviderSub,
    isValidRealmName,
} from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { ExpressRequest } from '../../../type';
import { extendExpressValidationResultWithRealm } from '../../realm';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { IdentityProviderValidationResult } from '../type';
import { CRUDOperation } from '../../../constants';
import {
    extractLdapIdentityProviderProtocolAttributes,
    extractOAuth2IdentityProviderProtocolAttributes,
    extractOidcConnectIdentityProviderProtocolAttributes,
    validateLdapIdentityProviderProtocol,
    validateOAuth2IdentityProviderProtocol,
    validateOidcIdentityProviderProtocol,
} from '../../../../domains/identity-provider/protocol';

export async function runOauth2ProviderValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<IdentityProviderValidationResult> {
    const result : IdentityProviderValidationResult = {
        attributes: {},
        data: {},
        meta: {},
    };

    await check('sub')
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
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    switch (result.data.protocol) {
        case IdentityProviderProtocol.OAUTH2: {
            result.attributes = validateOAuth2IdentityProviderProtocol(
                extractOAuth2IdentityProviderProtocolAttributes(req.body),
            );
            break;
        }
        case IdentityProviderProtocol.OIDC: {
            result.attributes = validateOidcIdentityProviderProtocol(
                extractOidcConnectIdentityProviderProtocolAttributes(req.body),
            );
            break;
        }
        case IdentityProviderProtocol.LDAP: {
            result.attributes = validateLdapIdentityProviderProtocol(
                extractLdapIdentityProviderProtocolAttributes(req.body),
            );
            break;
        }
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRealm(result);
    if (result.meta.realm) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.realm.id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    if (
        operation === CRUDOperation.CREATE &&
        !result.data.realm_id
    ) {
        result.data.realm_id = req.realmId;
    }

    return result;
}
