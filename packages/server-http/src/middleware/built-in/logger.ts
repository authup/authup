/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-common';
import morgan from 'morgan';
import {
    Next, Request, Response, Router, getRequestIp,
} from 'routup';
import { useRequestEnv } from '../../utils';

export function registerLoggerMiddleware(router: Router) {
    router.use((
        request: Request,
        response: Response,
        next: Next,
    ) => {
        morgan(
            (tokens, req: Request, res: Response) => {
                const parts = [
                    getRequestIp(req),
                ];

                const userId = useRequestEnv(req, 'userId');
                const robotId = useRequestEnv(req, 'robotId');
                const clientId = useRequestEnv(req, 'clientId');

                if (userId || robotId || clientId) {
                    if (userId) {
                        parts.push(`user#${userId}`);
                    } else if (robotId) {
                        parts.push(`robot#${robotId}`);
                    } else {
                        parts.push(`client#${clientId}`);
                    }
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
                        useLogger().http(message.replace('\n', ''));
                    },
                },
            },
        )(request, response, next);
    });
}
