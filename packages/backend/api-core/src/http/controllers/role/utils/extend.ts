/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { Role } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { RoleEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

type ExpressValidationResultExtendedWithRole = ExpressValidationResult<{
    role_id: Role['id']
}, {
    role?: RoleEntity
}>;

export async function extendExpressValidationResultWithRole<
    T extends ExpressValidationResultExtendedWithRole,
>(result: T) : Promise<T> {
    if (result.data.role_id) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(RoleEntity);
        const entity = await repository.findOneBy({ id: result.data.role_id });
        if (typeof entity === 'undefined') {
            throw new BadRequestError(buildExpressValidationErrorMessage('role_id'));
        }

        result.meta.role = entity;
    }

    return result;
}
