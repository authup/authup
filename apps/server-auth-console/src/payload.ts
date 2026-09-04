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
 *
 * It dispatches against `apiInternalUrl`, never the browser-facing `apiUrl`:
 * this is a server-side call, so it must not depend on the public address
 * resolving from inside the deployment. Unlike server-core's own internal
 * client the swap is on `baseURL` rather than at the transport layer,
 * because nothing derived from it reaches a caller -- there is no
 * `redirect_uri` here to be compared byte for byte later.
 */
export function createAPIClient(config: Config) : Client {
    return new Client({ baseURL: config.apiInternalUrl });
}

/**
 * Report an outbound failure to the operator and raise one the visitor may
 * see, which is deliberately not the same error.
 *
 * hapic embeds the resolved request URL in its message, and this service has
 * no error middleware: routup answers with `event.error.message` verbatim, on
 * the public login page. That URL is `apiInternalUrl`, which on a split
 * deployment names a service on the operator's own network, so an API that is
 * merely down would publish its internal address to every anonymous visitor.
 * It was harmless while the value was `publicUrl`, an address the browser
 * already had.
 *
 * The rule and the remedy are server-core's own (`sanitizeError` /
 * `describeError`): the caller gets a message it can act on, the detail goes
 * to the log. `console.error` rather than a logger because a console handler
 * is built from a config alone and is given none -- and because this line is
 * the only trace such a failure leaves, which is how #3550 was diagnosed in
 * the first place.
 */
function failWithoutAddress(error: unknown) : never {
    // eslint-disable-next-line no-console
    console.error('[authup] the auth console could not reach the API:', error);

    throw new Error('The identity provider could not be reached.');
}

/**
 * The feature flags every workflow page gates its form on. A page that
 * cannot reach them must not silently claim a workflow is disabled, so the
 * failure propagates rather than defaulting to false.
 *
 * Read ONCE and held for the reader's lifetime, the same shape render.ts
 * keeps for the dist template, manifest and render entry: `GET /` reports
 * the version and the boot-config feature flags, none of which changes
 * without a restart, so a TTL would be a number with nothing behind it.
 * Without it every workflow page render is an API call, and under the
 * composed `authup start` those all arrive over loopback on one shared
 * rate-limit key. Only a SUCCESS is held, so an API that was down at the
 * first render is retried rather than remembered as broken.
 *
 * The cache is instance-scoped rather than module-scoped (098 C4): the
 * answer depends on which API the client was built against, so two handlers
 * in one process must not share one, and a module slot would additionally
 * leak between test cases.
 */
export function createFeaturesReader(client: Client) : () => Promise<StatusResponseFeatures> {
    let cached : StatusResponseFeatures | undefined;
    let pending : Promise<StatusResponseFeatures> | undefined;

    return () => {
        if (cached) {
            return Promise.resolve(cached);
        }

        if (pending) {
            return pending;
        }

        pending = client.status.get()
            .then((status: StatusResponse) => {
                cached = status.features;

                return cached;
            })
            .catch((e) => failWithoutAddress(e));

        const clear = () => {
            pending = undefined;
        };
        pending.then(clear, clear);

        return pending;
    };
}

/**
 * The `/authorize` render input, resolved by server-core (plan 101 D2-1).
 * The browser's query is forwarded verbatim: the answer is derived from all
 * of it, the `provider` hint and the closed `error` marker set included.
 */
export async function readAuthorizeInfo(client: Client, event: IAppEvent) : Promise<AuthorizeInfo> {
    const { search } = new URL(event.request.url);

    try {
        return await client.authorize.getInfo(search);
    } catch (e) {
        return failWithoutAddress(e);
    }
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
