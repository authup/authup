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
    DPost,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';

export type PasswordForgotControllerContext = {
    service: IPasswordRecoveryService,
};

@DController('/password-forgot')
export class PasswordForgotController {
    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordForgotControllerContext) {
        this.service = ctx.service;
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordForgotPayload,
        @DContext() event: IRoutupEvent,
    ): Promise<PasswordForgotResponse> {
        const result = await this.service.forgotPassword(data);

        event.response.status = 202;

        return result;
    }
}
