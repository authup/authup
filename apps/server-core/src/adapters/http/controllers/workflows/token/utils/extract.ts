/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IRoutupEvent } from 'routup';
import {
    ValidupError, 
    buildErrorMessageForAttribute, 
    defineIssueItem, 
    isValidupError,
} from 'validup';
import { readFromLocations, useRequestToken } from '../../../../request/index.ts';
import { TokenRequestValidator } from './validator.ts';

export async function extractTokenFromRequest(event: IRoutupEvent) : Promise<string> {
    let token : string | undefined;

    try {
        const validator = new TokenRequestValidator();
        const data = await validator.run(
            await readFromLocations(event, ['body', 'query', 'params']),
        );

        token = data.token;
    } catch (e) {
        if (!isValidupError(e)) {
            throw e;
        }
        token = useRequestToken(event);
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
