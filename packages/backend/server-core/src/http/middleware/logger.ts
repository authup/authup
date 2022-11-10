/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import morgan from 'morgan';
import { Request, Response, Next } from 'routup';
import { useLogger } from '../../logger';
import { useRequestEnv } from '../utils';

export function createLoggerMiddleware() {
    const logger = useLogger();

    return (
        request: Request,
        response: Response,
        next: Next,
    ) => {
        if (logger) {
            morgan(
                (tokens, req: Request, res: Response) => {
                    const parts = [
                        tokens['remote-addr'](req, res),
                    ];

                    const userId = useRequestEnv(req,'userId');
                    const robotId = useRequestEnv(req,'robotId');
                    const clientId = useRequestEnv(req,'clientId');

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
                            logger.http(message.replace('\n', ''));
                        },
                    },
                },
            )(request, response, next);
        } else {
            next();
        }
    };
}
