/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import morgan from 'morgan';
import type {
    Next, Request, Response, Router,
} from 'routup';
import { coreHandler, getRequestIP, useRequestPath } from 'routup';
import { useLogger } from '@authup/server-kit';
import { useConfig } from '../../../../config';
import { EnvironmentName } from '../../../../env';
import { useRequestIdentity } from '../../request';

export function registerLoggerMiddleware(router: Router) {
    router.use(coreHandler((
        request: Request,
        response: Response,
        next: Next,
    ) => {
        const config = useConfig();

        morgan(
            (tokens, req: Request, res: Response) => {
                const parts = [
                    getRequestIP(req, { trustProxy: true }),
                ];

                const identity = useRequestIdentity(req);
                if (identity) {
                    parts.push(`${identity.type}#${identity.id}`);
                }

                return [
                    ...parts,
                    '-',
                    tokens.method(req, res),
                    tokens.url(req, res),
                    tokens.status(req, res),
                    '-',
                    `${tokens['response-time'](req, res)}ms`,
                ].join(' ');
            },
            {
                stream: {
                    write(message) {
                        if (config.env !== EnvironmentName.TEST) {
                            useLogger()
                                .http(message.replace('\n', ''));
                        }
                    },
                },
                skip(req: Request, res: Response): boolean {
                    const path = useRequestPath(req);
                    if (path.length === 0 || path === '/') {
                        return true;
                    }

                    if (config.env === EnvironmentName.PRODUCTION) {
                        return res.statusCode < 400;
                    }

                    return false;
                },
            },
        )(request, response, next);
    }));
}
