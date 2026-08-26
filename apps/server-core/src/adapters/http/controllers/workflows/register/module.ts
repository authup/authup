/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RegisterPayload, RegisterResponse } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { useRequestLocale } from '../../../request/index.ts';
import { redirectToAuthConsole } from '../auth-console.ts';

export type RegisterControllerOptions = {
    authConsoleUrl: string,
};

export type RegisterControllerContext = {
    options: RegisterControllerOptions,
    service: IRegistrationService,
};

@DController('/register')
export class RegisterController {
    protected options: RegisterControllerOptions;

    protected service: IRegistrationService;

    constructor(ctx: RegisterControllerContext) {
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
        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/register');
    }

    @DPost('', [])
    async execute(
        @DBody() data: RegisterPayload,
        @DContext() event: IAppEvent,
    ): Promise<RegisterResponse> {
        const result = await this.service.register(data, { locale: useRequestLocale(event) });

        event.response.status = 202;

        return result;
    }
}
