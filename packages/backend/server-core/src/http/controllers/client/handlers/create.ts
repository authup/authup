/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionID,
} from '@authelion/common';
import { Request, Response, send } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils';
import { runOauth2ClientValidation } from '../utils';
import { OAuth2ClientEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createClientRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.CLIENT_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ClientValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    const provider = repository.create(result.data);

    await repository.save(provider);

    return send(res, provider);
}
