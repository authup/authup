/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { isRealmResourceWritable } from '@authup/core-kit';
import type { Request } from 'routup';
import type { ClientScopeEntity } from '../../../../domains';
import {
    ClientEntity, ScopeEntity,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult, matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runClientScopeValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<ClientScopeEntity>> {
    const result : ExpressValidationResult<ClientScopeEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('client_id')
            .exists()
            .isUUID()
            .run(req);

        await check('scope_id')
            .exists()
            .isUUID()
            .run(req);
    }

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

    if (
        result.relation.client &&
        result.relation.client.realm_id
    ) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.client.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('client_id'));
        }
    }

    await extendExpressValidationResultWithRelation(result, ScopeEntity, {
        id: 'scope_id',
        entity: 'scope',
    });

    // ----------------------------------------------

    return result;
}
