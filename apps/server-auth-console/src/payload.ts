/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizeInfo, StatusResponse, StatusResponseFeatures } from '@authup/core-http-kit';
import { Client } from '@authup/core-http-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { sanitizeRelativeRedirect } from './redirect';
import type { Config } from './types';

/**
 * The service hydrates ANONYMOUSLY. It holds no credential of its own and
 * asks server-core only for what an unauthenticated visitor may see, which
 * is the whole of what these pages render.
 */
export function createAPIClient(config: Config) : Client {
    return new Client({ baseURL: config.apiUrl });
}

/**
 * The feature flags every workflow page gates its form on. A page that
 * cannot reach them must not silently claim a workflow is disabled, so the
 * failure propagates rather than defaulting to false.
 */
export async function readFeatures(client: Client) : Promise<StatusResponseFeatures> {
    const status : StatusResponse = await client.status.get();

    return status.features;
}

/**
 * The `/authorize` render input, resolved by server-core (plan 101 D2-1).
 * The browser's query is forwarded verbatim: the answer is derived from all
 * of it, the `provider` hint and the closed `error` marker set included.
 */
export function readAuthorizeInfo(client: Client, event: IAppEvent) : Promise<AuthorizeInfo> {
    const { search } = new URL(event.request.url);

    return client.authorize.getInfo(search);
}

export type WorkflowPageOptions = {
    // Whether the page consumes the `realmId` (legacy `realm_id`) / `token`
    // query params (e.g. prefill from an email deep link). Off by default so
    // a page never reflects a param it doesn't use.
    realmAware?: boolean,
    tokenAware?: boolean,
};

/**
 * The payload the four workflow pages render from: the feature flags plus
 * the handful of query params each one declares. Unchanged from the
 * assembly server-core did before the split, including the open-redirect
 * guard on `redirect`.
 */
export function buildWorkflowPageData(
    event: IAppEvent,
    features: StatusResponseFeatures,
    options: WorkflowPageOptions = {},
) : Record<string, any> {
    const query = useRequestQuery(event);

    const data: Record<string, any> = {
        features,
        redirect: sanitizeRelativeRedirect(query.redirect),
    };

    if (options.realmAware) {
        const realmId = typeof query.realmId === 'string' ? query.realmId : query.realm_id;
        data.realmId = typeof realmId === 'string' ? realmId : undefined;
    }

    if (options.tokenAware) {
        data.token = typeof query.token === 'string' ? query.token : undefined;
    }

    return data;
}
