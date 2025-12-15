/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import morgan from 'morgan';
import type {
    Handler,
    Next, Request, Response,
} from 'routup';
import { coreHandler, getRequestIP, useRequestPath } from 'routup';
import { useLogger } from '@authup/server-kit';
import { EnvironmentName } from '../../../../env';
import { useRequestIdentity } from '../../request';

type LoggerMiddlewareOptions = {
    env: string
};
export function createLoggerMiddleware(options: LoggerMiddlewareOptions) : Handler {
    return coreHandler((
        request: Request,
        response: Response,
        next: Next,
    ) => {
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
                        if (options.env !== EnvironmentName.TEST) {
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

                    if (options.env === EnvironmentName.PRODUCTION) {
                        return res.statusCode < 400;
                    }

                    return false;
                },
            },
        )(request, response, next);
    });
}
