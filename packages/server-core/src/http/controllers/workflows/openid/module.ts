/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OpenIDProviderMetadata } from '@authup/specs';
import {
    DController, DGet, DRequest, DResponse,
} from '@routup/decorators';
import { getOpenIdConfigurationRouteHandler } from './handlers';

@DController('')
export class OpenIDController {
    @DGet('/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OpenIDProviderMetadata[]> {
        return getOpenIdConfigurationRouteHandler(req, res);
    }
}
