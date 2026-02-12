/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAPICheckResponse } from '@authup/core-http-kit';
import {
    BuiltInPolicyType, PolicyData, definePolicyEvaluationContext,
} from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { useRequestBody } from '@routup/basic/body';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import type { FindOptionsWhere } from 'typeorm';
import type { PolicyEntity } from '../../../../../database/domains/index.ts';
import { PolicyRepository, resolveRealm } from '../../../../../database/domains/index.ts';
import { PolicyEngine } from '../../../../../../security/index.ts';
import { useRequestIdentity } from '../../../../request/index.ts';

export async function checkPolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);
    let criteria : FindOptionsWhere<PolicyEntity>;

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

    const policyEngine = new PolicyEngine();

    let output : PolicyAPICheckResponse;
    try {
        await policyEngine.evaluate(entity, definePolicyEvaluationContext({
            data: new PolicyData(data),
        }));

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
