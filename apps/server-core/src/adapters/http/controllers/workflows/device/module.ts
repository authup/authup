/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { DContext, DController, DGet } from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { redirectToAuthConsole } from '../auth-console.ts';
import type { DeviceControllerContext, DeviceControllerOptions } from './types.ts';

@DController('/device')
export class DeviceController {
    protected options : DeviceControllerOptions;

    constructor(ctx: DeviceControllerContext) {
        this.options = ctx.options;
    }

    /**
     * The verification page renders in the auth console service; this hop
     * carries the request's own parameters (the user_code) over to it.
     */
    @DGet('', [])
    async serve(@DContext() event: IAppEvent) : Promise<Response> {
        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/device');
    }
}
