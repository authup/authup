/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, isPropertySet } from '@authup/kit';
import { useRequestBody } from '@routup/basic/body';
import { check, validationResult } from 'express-validator';
import {
    isRealmResourceWritable,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { ZodError } from 'zod';
import type { PolicyEntity } from '../../../../domains';
import {
    RealmEntity,
    validateAttributeNamesPolicyShaping,
    validateAttributesPolicyShaping,
    validateDatePolicyShaping,
    validateTimePolicyShaping,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    buildRequestValidationErrorMessageForZodError,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

type PolicyValidationResult = PolicyEntity & {
    parent_id?: string
};

export async function runPolicyProviderValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<PolicyValidationResult, { attributes: Record<string, any> }>> {
    const result : ExpressValidationResult<PolicyValidationResult, { attributes: Record<string, any> }> = initExpressValidationResult();

    await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 })
        .run(req);

    await check('invert')
        .exists()
        .notEmpty()
        .isBoolean()
        .run(req);

    await check('type')
        .exists()
        .notEmpty()
        .isIn(Object.values(BuiltInPolicyType))
        .run(req);

    await check('parent_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
        .run(req);

    if (operation === 'create') {
        await check('realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true })
            .run(req);
    }

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    try {
        result.meta.attributes = {};

        const body = useRequestBody(req);

        switch (result.data.type) {
            case BuiltInPolicyType.ATTRIBUTES: {
                result.meta.attributes = validateAttributesPolicyShaping(body);
                break;
            }
            case BuiltInPolicyType.ATTRIBUTE_NAMES: {
                result.meta.attributes = validateAttributeNamesPolicyShaping(body);
                break;
            }
            case BuiltInPolicyType.DATE: {
                result.meta.attributes = validateDatePolicyShaping(body);
                break;
            }
            case BuiltInPolicyType.TIME: {
                result.meta.attributes = validateTimePolicyShaping(body);
                break;
            }
        }
    } catch (e: any) {
        if (e instanceof ZodError) {
            throw new BadRequestError(buildRequestValidationErrorMessageForZodError(e));
        }

        if (e instanceof Error) {
            throw new BadRequestError(e.message, {
                cause: e,
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

    // ----------------------------------------------

    return result;
}
