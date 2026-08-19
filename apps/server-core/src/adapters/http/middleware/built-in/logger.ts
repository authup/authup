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

// Query params whose values are credentials/tokens — the access log must never
// persist them (a GET /logout?id_token_hint=<jwt> would otherwise write a
// signature-valid token into the log).
const SENSITIVE_QUERY_PARAMS = [
    'id_token_hint',
    'id_token',
    'access_token',
    'refresh_token',
    'token',
    'code',
    'client_secret',
    // a federated login handle exchanges for a token pair (plan 094)
    'loginHandle',
    'loginChallenge',
];

export function redactSensitiveURLParams(url: string): string {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) {
        return url;
    }

    const params = new URLSearchParams(url.substring(queryIndex + 1));
    let redacted = false;
    for (const name of SENSITIVE_QUERY_PARAMS) {
        if (params.has(name)) {
            params.set(name, '***');
            redacted = true;
        }
    }

    if (!redacted) {
        return url;
    }

    return `${url.substring(0, queryIndex)}?${params.toString()}`;
}

export function createLoggerMiddleware(options: LoggerMiddlewareOptions) : Handler {
    return logger({
        format: (tokens, event, response) => [
            getRequestIP(event) || '-',
            '-',
            tokens.method(event, response) ?? '-',
            redactSensitiveURLParams(tokens.url(event, response) ?? '-'),
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
