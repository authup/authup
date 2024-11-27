/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionAPICheckResponse } from '@authup/core-http-kit';
import type { PermissionCheckerCheckContext } from '@authup/rules';
import { PermissionChecker, PolicyDataValidator } from '@authup/rules';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity, resolveRealm } from '../../../../../database/domains';
import { PermissionDBProvider, PolicyEngine } from '../../../../../security';
import { useRequestIdentity } from '../../../../request';

export async function checkPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    let criteria : Partial<PermissionEntity>;

    if (isUUID(id)) {
        criteria = {
            id,
        };
    } else {
        const realm = await resolveRealm(useRequestParam(req, 'realmId'));
        criteria = {
            name: id,
            ...(realm ? { realm_id: realm.id } : {}),
        };
    }

    const entity = await repository.findOneBy(criteria);
    if (!entity) {
        throw new NotFoundError();
    }

    const validator = new PolicyDataValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req);
    if (
        !data.identity &&
        data.identity !== null
    ) {
        data.identity = useRequestIdentity(req);
    }

    const ctx : PermissionCheckerCheckContext = {
        name: entity.name,
        data,
    };

    const permissionChecker = new PermissionChecker({
        provider: new PermissionDBProvider(dataSource),
        policyEngine: new PolicyEngine(),
    });

    let output : PermissionAPICheckResponse;
    try {
        if (ctx.data.attributes) {
            await permissionChecker.check(ctx);
        } else {
            await permissionChecker.preCheck(ctx);
        }

        output = {
            status: 'success',
        };
    } catch (e) {
        output = {
            status: 'error',
            data: e,
        };
    }

    return sendAccepted(res, output);
}
