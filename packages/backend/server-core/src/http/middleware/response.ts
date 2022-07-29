/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ExpressNextFunction, ExpressRequest, ExpressResponse, ExpressResponseMessage,
} from '../type';

export function responseMiddleware(
    request: ExpressRequest,
    response: ExpressResponse,
    next: ExpressNextFunction,
) {
    response.respond = (message?: ExpressResponseMessage) => {
        if (typeof message !== 'undefined') {
            if (message.data == null) {
                message.statusCode ??= 204;
            } else {
                message.statusCode ??= 200;
            }

            if (message.data) response.json(message.data);
        } else {
            message = {
                statusCode: 204,
            };
        }

        response.status(message.statusCode);

        return response.end();
    };

    // --------------------------------------------------------------------

    response.respondDeleted = (message?: ExpressResponseMessage) => response.respond({
        statusCode: 200,
        statusMessage: 'Deleted',
        ...(message || {}),
    });

    response.respondCreated = (message?: ExpressResponseMessage) => response.respond({
        statusCode: 201,
        statusMessage: 'Created',
        ...(message || {}),
    });

    response.respondAccepted = (message?: ExpressResponseMessage) => response.respond({
        statusCode: 202,
        statusMessage: 'Accepted',
        ...(message || {}),
    });

    next();
}
