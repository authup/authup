/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordResetPayload, PasswordResetResponse } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';
import { redirectToAuthConsole } from '../auth-console.ts';

export type PasswordResetControllerOptions = {
    authConsoleUrl: string,
};

export type PasswordResetControllerContext = {
    options: PasswordResetControllerOptions,
    service: IPasswordRecoveryService,
};

@DController('/password-reset')
export class PasswordResetController {
    protected options: PasswordResetControllerOptions;

    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordResetControllerContext) {
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
        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/password-reset');
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordResetPayload,
        @DContext() event: IAppEvent,
    ): Promise<PasswordResetResponse> {
        const result = await this.service.resetPassword(data);

        event.response.status = 202;

        return result;
    }
}
