/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { sanitizeRelativeRedirect } from '../../request/index.ts';
import { renderUIPage } from './module.ts';
import type { ServeWorkflowPageOptions } from './types.ts';

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
