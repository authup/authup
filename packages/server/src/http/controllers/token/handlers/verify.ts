/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionID,
} from '@typescript-auth/domains';
import {
    ForbiddenError, NotFoundError,
} from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { extendOAuth2TokenVerification, verifyOAuth2Token } from '../../../oauth2';
import { ControllerOptions } from '../../type';

export async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    options: ControllerOptions,
) : Promise<any> {
    let { id } = req.params;

    if (
        !id &&
        typeof req.token === 'string'
    ) {
        id = req.token;
    }

    if (!id) {
        throw new NotFoundError();
    }

    const hasPermission = req.ability &&
        req.ability.hasPermission(PermissionID.TOKEN_VERIFY);

    if (
        req.token !== id &&
        !hasPermission
    ) {
        throw new ForbiddenError();
    }

    const token = await verifyOAuth2Token(
        id,
        {
            keyPairOptions: {
                directory: options.writableDirectoryPath,
            },
            redis: options.redis,
        },
    );

    const response = await extendOAuth2TokenVerification(token);

    return res.respond({
        data: response,
    });
}
