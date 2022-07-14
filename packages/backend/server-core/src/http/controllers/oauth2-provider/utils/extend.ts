/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { OAuth2Provider } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { OAuth2ProviderEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

type ExpressValidationResultExtendedWithOAuth2Provider = ExpressValidationResult<{
    provider_id: OAuth2Provider['id']
}, {
    provider?: OAuth2ProviderEntity
}>;

export async function extendExpressValidationResultWithOAuth2Provider<
    T extends ExpressValidationResultExtendedWithOAuth2Provider,
>(result: T) : Promise<T> {
    if (result.data.provider_id) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2ProviderEntity);
        const entity = await repository.findOneBy({ id: result.data.provider_id });
        if (!entity) {
            throw new BadRequestError(buildExpressValidationErrorMessage('provider_id'));
        }

        result.meta.provider = entity;
    }

    return result;
}
