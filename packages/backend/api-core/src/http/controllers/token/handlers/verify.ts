/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionID,
} from '@authelion/common';
import {
    ForbiddenError, NotFoundError,
} from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { extendOAuth2Token, validateOAuth2Token } from '../../../oauth2';
import { Config } from '../../../../config';

export async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
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

    const token = await validateOAuth2Token(id);
    const response = await extendOAuth2Token(token);

    return res.respond({
        data: response,
    });
}
