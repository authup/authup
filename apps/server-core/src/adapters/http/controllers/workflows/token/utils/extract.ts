/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    ValidupError, buildErrorMessageForAttribute, defineIssueItem,
} from 'validup';
import { useRequestToken } from '../../../../request/index.ts';
import { TokenRequestValidator } from './validator.ts';

export async function extractTokenFromRequest(req: Request) : Promise<string> {
    let token : string | undefined;

    try {
        const validator = new TokenRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            locations: ['body', 'query', 'params'],
        });

        token = data.token;
    } catch (e) {
        token = useRequestToken(req);
    }

    if (!token) {
        throw new ValidupError([
            defineIssueItem({
                path: ['token'],
                message: buildErrorMessageForAttribute('token'),
            }),
        ]);
    }

    return token;
}
