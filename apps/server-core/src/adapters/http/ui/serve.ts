/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { sanitizeRelativeRedirect } from '../request/index.ts';
import { renderUIPage } from './render.ts';

export type ServeWorkflowPageOptions = {
    url: string,
    baseURL: string,
    features: StatusResponseFeatures,
    // Whether the page consumes the `realmId` (legacy `realm_id`) / `token`
    // query params (e.g. prefill from an email deep link). Off by default so
    // a page never reflects a param it doesn't use.
    realmAware?: boolean,
    tokenAware?: boolean,
};

/**
 * Single SSR payload-assembly path for the auth workflow GET routes:
 * whitelists query params, applies the open-redirect guard, and renders.
 * Keeps the four workflow controllers as thin POST adapters.
 */
export function serveWorkflowPage(
    event: IAppEvent,
    options: ServeWorkflowPageOptions,
): Promise<string> {
    const query = useRequestQuery(event);

    const data: Record<string, any> = {
        features: options.features,
        redirect: sanitizeRelativeRedirect(query.redirect),
    };

    if (options.realmAware) {
        const realmId = typeof query.realmId === 'string' ? query.realmId : query.realm_id;
        data.realmId = typeof realmId === 'string' ? realmId : undefined;
    }

    if (options.tokenAware) {
        data.token = typeof query.token === 'string' ? query.token : undefined;
    }

    return renderUIPage(event, {
        url: options.url,
        payload: {
            config: { baseURL: options.baseURL },
            data,
        },
    });
}
