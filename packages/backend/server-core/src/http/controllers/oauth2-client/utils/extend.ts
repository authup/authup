/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { OAuth2Client } from '@authelion/common';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../express-validation';
import { OAuth2ClientEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

type ExpressValidationResultExtendedWithOAuth2Client = ExpressValidationResult<{
    client_id: OAuth2Client['id']
}, {
    client?: OAuth2ClientEntity
}>;

export async function extendExpressValidationResultWithOAuth2Client<
    T extends ExpressValidationResultExtendedWithOAuth2Client,
>(result: T) : Promise<T> {
    if (result.data.client_id) {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2ClientEntity);
        const entity = await repository.findOneBy({ id: result.data.client_id });
        if (!entity) {
            throw new BadRequestError(buildExpressValidationErrorMessage('client_id'));
        }

        result.meta.client = entity;
    }

    return result;
}
