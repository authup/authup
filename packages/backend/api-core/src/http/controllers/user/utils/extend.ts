/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import { User } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { UserEntity } from '../../../../domains';

type ExpressValidationResultExtendedWithUser = ExpressValidationResult<{
    user_id: User['id']
}, {
    user?: UserEntity
}>;

export async function extendExpressValidationResultWithUser<
    T extends ExpressValidationResultExtendedWithUser,
>(result: T) : Promise<T> {
    if (result.data.user_id) {
        const repository = getRepository(UserEntity);
        const entity = await repository.findOne(result.data.user_id);
        if (typeof entity === 'undefined') {
            throw new BadRequestError(buildExpressValidationErrorMessage('user_id'));
        }

        result.meta.user = entity;
    }

    return result;
}
