/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { useConfigSync } from '../../config';
import { useLogger } from '../../config/logger/module';

export function createLoggerMiddleware() {
    const logger = useLogger();

    return (
        request: ExpressRequest,
        response: ExpressResponse,
        next: ExpressNextFunction,
    ) => {
        if (logger) {
            const startTime = Date.now();

            response.on('finish', () => {
                logger.http({
                    processingTime: Date.now() - startTime,
                    httpVersion: request.httpVersion,
                    remoteAddress: request.ip,
                    remoteFamily: request.socket.remoteFamily,
                    method: request.method,
                    url: request.url,
                    rawHeaders: request.rawHeaders,
                    response: {
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                    },
                });
            });
        }

        next();
    };
}
