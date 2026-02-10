/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionAPICheckResponse } from '@authup/core-http-kit';
import type { PermissionCheckerCheckContext } from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionChecker, PolicyData,
} from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { useRequestBody } from '@routup/basic/body';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import type { FindOptionsWhere } from 'typeorm';
import { PermissionEntity, resolveRealm } from '../../../../../database/domains/index.ts';
import { PermissionDBProvider, PolicyEngine } from '../../../../../../security/index.ts';
import { useRequestIdentity } from '../../../../request/index.ts';

export async function checkPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    let criteria : FindOptionsWhere<PermissionEntity>;

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

    const data = useRequestBody(req);
    if (
        !data[BuiltInPolicyType.IDENTITY] &&
        data[BuiltInPolicyType.IDENTITY] !== null
    ) {
        data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(req);
    }

    const ctx : PermissionCheckerCheckContext = {
        name: entity.name,
        input: new PolicyData(data),
    };

    const permissionChecker = new PermissionChecker({
        provider: new PermissionDBProvider(dataSource),
        policyEngine: new PolicyEngine(),
    });

    let output : PermissionAPICheckResponse;
    try {
        if (
            ctx.input &&
            ctx.input.has(BuiltInPolicyType.ATTRIBUTES)
        ) {
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
            data: e as Error,
        };
    }

    return sendAccepted(res, output);
}
