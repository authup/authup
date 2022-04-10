/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import { Role } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { RoleEntity } from '../../../../domains';

type ExpressValidationResultExtendedWithRole = ExpressValidationResult<{
    [key: string]: any,
    role_id: Role['id']
}, {
    [key: string]: any,
    role?: RoleEntity
}>;

export async function extendExpressValidationResultWithRole<
    T extends ExpressValidationResultExtendedWithRole,
>(result: T) : Promise<T> {
    if (result.data.role_id) {
        const repository = getRepository(RoleEntity);
        const entity = await repository.findOne(result.data.role_id);
        if (typeof entity === 'undefined') {
            throw new BadRequestError(buildExpressValidationErrorMessage('role_id'));
        }

        result.meta.role = entity;
    }

    return result;
}
