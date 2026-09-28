/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import {
    ValidupError,
    buildErrorMessageForAttribute,
    isValidupError,
} from 'validup';
import { defineIssueItem } from '@ebec/core';
import { useRequestQuery } from '@routup/basic/query';
import { readFromLocations, useRequestToken } from '../../../../request/index.ts';
import { TokenRequestValidator } from './validator.ts';

export async function extractTokenFromRequest(event: IAppEvent) : Promise<string> {
    // RFC 7662 §2.1 / RFC 7009 §2.1: the token travels in the form body. A
    // url is kept by access logs, proxies and browser history, so a token
    // there is refused rather than read.
    if (typeof useRequestQuery(event, 'token') !== 'undefined') {
        throw new ValidupError([
            defineIssueItem({
                path: ['token'],
                message: 'The token must be sent in the request body, not in the url.',
            }),
        ]);
    }

    let token : string | undefined;

    try {
        const validator = new TokenRequestValidator();
        const data = await validator.run(
            await readFromLocations(event, ['body']),
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
