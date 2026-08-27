/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordForgotPayload, PasswordForgotResponse } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';
import { useRequestLocale } from '../../../request/index.ts';
import { redirectToAuthConsole } from '../auth-console.ts';

export type PasswordForgotControllerOptions = {
    authConsoleUrl: string,
};

export type PasswordForgotControllerContext = {
    options: PasswordForgotControllerOptions,
    service: IPasswordRecoveryService,
};

@DController('/password-forgot')
export class PasswordForgotController {
    protected options: PasswordForgotControllerOptions;

    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordForgotControllerContext) {
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
        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/password-forgot');
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordForgotPayload,
        @DContext() event: IAppEvent,
    ): Promise<PasswordForgotResponse> {
        const result = await this.service.forgotPassword(data, { locale: useRequestLocale(event) });

        event.response.status = 202;

        return result;
    }
}
