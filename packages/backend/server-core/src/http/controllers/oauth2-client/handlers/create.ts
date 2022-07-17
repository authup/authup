/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runOauth2ClientValidation } from '../utils';
import { OAuth2ClientEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createOauth2ClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.has(PermissionID.CLIENT_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ClientValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    const provider = repository.create(result.data);

    await repository.save(provider);

    return res.respond({
        data: provider,
    });
}
