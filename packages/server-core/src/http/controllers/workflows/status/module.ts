/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet, DRequest, DResponse,
} from '@routup/decorators';
import type { EndpointInfo } from './handlers';
import { useStatusRouteHandler } from './handlers';

@DController('')
export class StatusController {
    @DGet('/', [])
    async status(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<EndpointInfo> {
        return useStatusRouteHandler(req, res);
    }
}
