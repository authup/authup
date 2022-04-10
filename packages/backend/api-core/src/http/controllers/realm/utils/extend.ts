/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import { Realm } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { RealmEntity } from '../../../../domains';

type ExpressValidationResultExtendedWithRealm = ExpressValidationResult<{
    realm_id?: Realm['id']
}, {
    realm?: RealmEntity
}>;

export async function extendExpressValidationResultWithRealm<
    T extends ExpressValidationResultExtendedWithRealm,
>(result: T) : Promise<T> {
    if (result.data.realm_id) {
        const repository = getRepository(RealmEntity);
        const entity = await repository.findOne(result.data.realm_id);
        if (typeof entity === 'undefined') {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }

        result.meta.realm = entity;
    }

    return result;
}
