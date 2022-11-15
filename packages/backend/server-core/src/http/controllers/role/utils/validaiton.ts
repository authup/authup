/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionID, isPermittedForResourceRealm, isValidRoleName,
} from '@authelion/common';
import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { Request } from 'routup';
import { useRequestEnv } from '../../../utils';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';
import { RealmEntity, RoleEntity } from '../../../../domains';

export async function runRoleValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RoleEntity>> {
    const result : ExpressValidationResult<RoleEntity> = initExpressValidationResult();

    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .custom((value) => {
            const isValid = isValidRoleName(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
            }

            return isValid;
        });

    if (operation === CRUDOperation.UPDATE) nameChain.optional();

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    await check('target')
        .exists()
        .isString()
        .isLength({ min: 3, max: 16 })
        .optional({ nullable: true })
        .run(req);

    if (operation === CRUDOperation.CREATE) {
        await check('realm_id')
            .exists()
            .isString()
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

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (result.relation.realm) {
        if (
            !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), result.relation.realm.id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    const ability = useRequestEnv(req, 'ability');

    if (operation === CRUDOperation.CREATE) {
        const permissionTarget = ability.getTarget(PermissionID.ROLE_ADD);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    } else {
        const permissionTarget = ability.getTarget(PermissionID.ROLE_EDIT);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    }

    return result;
}
