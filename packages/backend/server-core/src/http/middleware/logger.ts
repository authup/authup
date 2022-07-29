/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import morgan from 'morgan';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { useLogger } from '../../config/logger/module';

export function createLoggerMiddleware() {
    const logger = useLogger();

    return (
        request: ExpressRequest,
        response: ExpressResponse,
        next: ExpressNextFunction,
    ) => {
        if (logger) {
            morgan(
                (tokens, req: ExpressRequest, res: ExpressResponse) => {
                    const parts = [
                        tokens['remote-addr'](req, res),
                    ];

                    if (req.userId || req.robotId || req.clientId) {
                        if (req.userId) {
                            parts.push(`user#${req.userId}`);
                        } else if (req.robotId) {
                            parts.push(`robot#${req.robotId}`);
                        } else {
                            parts.push(`client#${req.client.id}`);
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
