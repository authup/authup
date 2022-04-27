/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { Permission } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { PermissionEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

type ExpressValidationResultExtendedWithPermission = ExpressValidationResult<{
    permission_id: Permission['id']
}, {
    permission?: PermissionEntity
}>;

export async function extendExpressValidationResultWithPermission<
    T extends ExpressValidationResultExtendedWithPermission,
>(result: T) : Promise<T> {
    if (result.data.permission_id) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(PermissionEntity);
        const entity = await repository.findOneBy({ id: result.data.permission_id });
        if (!entity) {
            throw new BadRequestError(buildExpressValidationErrorMessage('permission_id'));
        }

        result.meta.permission = entity;
    }

    return result;
}
