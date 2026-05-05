/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CorsOptions } from 'cors';
import cors from 'cors';
import type { Router } from 'routup';
import { defineCoreHandler } from 'routup';
import { merge } from 'smob';

export function registerCorsMiddleware(router: Router, input?: CorsOptions) {
    const options : CorsOptions = merge(input || {}, {
        origin(_origin, callback) {
            callback(null, true);
        },
        credentials: true,
    } satisfies CorsOptions);

    const handler = cors(options);

    router.use(defineCoreHandler(async (event) => {
        const node = event.request.runtime?.node;
        if (!node?.req || !node?.res) {
            return event.next();
        }

        await new Promise<void>((resolve, reject) => {
            handler(node.req as any, node.res as any, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (node.res.writableEnded) {
            return null;
        }

        return event.next();
    }));
}
