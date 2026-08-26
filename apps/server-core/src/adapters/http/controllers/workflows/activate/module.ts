/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { ActivatePayload } from '@authup/core-http-kit';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { redirectToAuthConsole } from '../auth-console.ts';
import { ActivateRequestValidator } from './validator.ts';

export type ActivateControllerOptions = {
    authConsoleUrl: string,
};

export type ActivateControllerContext = {
    options: ActivateControllerOptions,
    service: IRegistrationService,
};

@DController('/activate')
export class ActivateController {
    protected options: ActivateControllerOptions;

    protected service: IRegistrationService;

    constructor(ctx: ActivateControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
    }

    /**
     * The page renders in the auth console service; this hop carries the
     * request's own parameters over to it. The POST below stays here:
     * server-core keeps the protocol, the service keeps the render.
     */
    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<Response> {
        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/activate');
    }

    @DPost('', [])
    async execute(
        @DBody() data: ActivatePayload,
        @DContext() event: IAppEvent,
    ): Promise<null> {
        const validator = new ActivateRequestValidator();
        const validated = await validator.run(data);

        await this.service.activate(validated);

        event.response.status = 202;
        return null;
    }
}
