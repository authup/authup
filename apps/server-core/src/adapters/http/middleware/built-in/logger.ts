/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { logger } from '@routup/logger';
import type { Handler } from 'routup';
import { getRequestIP } from 'routup';
import type { Logger } from '@authup/server-kit';
import { EnvironmentName } from '@authup/kit';

type LoggerMiddlewareOptions = {
    env: string,
    logger: Logger
};

export function createLoggerMiddleware(options: LoggerMiddlewareOptions) : Handler {
    return logger({
        format: (tokens, event, response) => [
            getRequestIP(event) || '-',
            '-',
            tokens.method(event, response) ?? '-',
            tokens.url(event, response) ?? '-',
            tokens.status(event, response) ?? '-',
            '-',
            tokens['response-time'](event, response) ?? '-',
        ].join(' '),
        write(line) {
            if (options.env !== EnvironmentName.TEST) {
                options.logger.http(line);
            }
        },
        skip(event, response): boolean {
            const path = event.path || '';
            if (path.length === 0 || path === '/') {
                return true;
            }

            if (options.env === EnvironmentName.PRODUCTION) {
                return (response?.status ?? 0) < 400;
            }

            return false;
        },
    });
}
