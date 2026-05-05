/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import morgan from 'morgan';
import type { Handler } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import { useLogger } from '@authup/server-kit';
import { EnvironmentName } from '@authup/kit';

type LoggerMiddlewareOptions = {
    env: string
};

export function createLoggerMiddleware(options: LoggerMiddlewareOptions) : Handler {
    const formatter = morgan(
        (tokens, req, res) => [
            req.socket.remoteAddress || '-',
            '-',
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            '-',
            `${tokens['response-time'](req, res)}ms`,
        ].join(' '),
        {
            stream: {
                write(message) {
                    if (options.env !== EnvironmentName.TEST) {
                        useLogger().http(message.replace('\n', ''));
                    }
                },
            },
            skip(req, res): boolean {
                const url = req.url || '';
                if (url.length === 0 || url === '/') {
                    return true;
                }

                if (options.env === EnvironmentName.PRODUCTION) {
                    return res.statusCode < 400;
                }

                return false;
            },
        },
    );

    return fromNodeMiddleware(formatter);
}
