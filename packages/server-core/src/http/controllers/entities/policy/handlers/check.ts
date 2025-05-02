/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAPICheckResponse } from '@authup/core-http-kit';
import type { PolicyEngineEvaluateContext } from '@authup/access';
import { isUUID } from '@authup/kit';
import { PolicyDataValidator } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import type { PolicyEntity } from '../../../../../database/domains';
import { PolicyRepository, resolveRealm } from '../../../../../database/domains';
import { PolicyEngine } from '../../../../../security';
import { useRequestIdentity } from '../../../../request';

export async function checkPolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);
    let criteria : Partial<PolicyEntity>;

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

    const ctx : PolicyEngineEvaluateContext = {
        config: entity,
        input: data,
    };

    const policyEngine = new PolicyEngine();

    let output : PolicyAPICheckResponse;
    try {
        await policyEngine.evaluate(ctx);

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
