/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey } from '@authup/specs';
import {
    DController, DGet, DPath, DRequest, DResponse,
} from '@routup/decorators';
import { getJwkRouteHandler, getJwksRouteHandler } from './handlers';

@DController('')
export class JwkController {
    @DGet('/jwks', [])
    async getManyJwks(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey[]> {
        return getJwksRouteHandler(req, res);
    }

    @DGet('/jwks/:id', [])
    async getOneJwks(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey> {
        return getJwkRouteHandler(req, res);
    }
}
