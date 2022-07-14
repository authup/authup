/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { Realm } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { RealmEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

type ExpressValidationResultExtendedWithRealm = ExpressValidationResult<{
    realm_id?: Realm['id']
}, {
    realm?: RealmEntity
}>;

export async function extendExpressValidationResultWithRealm<
    T extends ExpressValidationResultExtendedWithRealm,
>(result: T) : Promise<T> {
    if (result.data.realm_id) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(RealmEntity);
        const entity = await repository.findOneBy({ id: result.data.realm_id });
        if (!entity) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }

        result.meta.realm = entity;
    }

    return result;
}
