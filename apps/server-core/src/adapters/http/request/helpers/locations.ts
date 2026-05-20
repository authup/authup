/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import { readRequestBody } from '@routup/basic/body';
import { useRequestCookies } from '@routup/basic/cookie';
import { useRequestQuery } from '@routup/basic/query';

export type RequestDataLocation = 'body' | 'query' | 'params' | 'cookies';

export async function readFromLocations(
    event: IAppEvent,
    locations: RequestDataLocation[],
): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const loc of locations) {
        switch (loc) {
            case 'body': {
                const body = await readRequestBody(event);
                if (body && typeof body === 'object') {
                    Object.assign(out, body);
                }
                break;
            }
            case 'query': {
                Object.assign(out, useRequestQuery(event));
                break;
            }
            case 'params': {
                Object.assign(out, event.params);
                break;
            }
            case 'cookies': {
                Object.assign(out, useRequestCookies(event));
                break;
            }
        }
    }
    return out;
}
