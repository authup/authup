/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isPermittedForResourceRealm } from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { ExpressRequest } from '../../../type';
import { CRUDOperation } from '../../../constants';
import { OAuth2ProviderRoleValidationResult } from '../type';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { extendExpressValidationResultWithRole } from '../../role';
import { extendExpressValidationResultWithOAuth2Provider } from '../../oauth2-provider';

export async function runOauth2ProviderRoleValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<OAuth2ProviderRoleValidationResult> {
    const result : OAuth2ProviderRoleValidationResult = {
        data: {},
        meta: {},
    };

    if (operation === CRUDOperation.CREATE) {
        await check('provider_id')
            .exists()
            .isUUID()
            .run(req);

        await check('role_id')
            .exists()
            .isUUID()
            .run(req);
    }

    const externalPromise = await check('external_id')
        .exists()
        .isLength({ min: 3, max: 36 });
    if (operation === CRUDOperation.UPDATE) externalPromise.optional();

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRole(result);
    if (result.meta.role) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.role.realm_id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.meta.role.realm_id;
    }

    await extendExpressValidationResultWithOAuth2Provider(result);
    if (result.meta.provider) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.provider.realm_id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('provider_id'));
        }

        result.data.provider_realm_id = result.meta.provider.realm_id;
    }

    return result;
}
