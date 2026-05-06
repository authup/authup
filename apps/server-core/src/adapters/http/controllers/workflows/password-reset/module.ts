/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordResetInput, PasswordResetResponse } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DPost,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';

export type PasswordResetControllerContext = {
    service: IPasswordRecoveryService,
};

@DController('/password-reset')
export class PasswordResetController {
    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordResetControllerContext) {
        this.service = ctx.service;
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordResetInput,
        @DContext() event: IRoutupEvent,
    ): Promise<PasswordResetResponse> {
        const result = await this.service.resetPassword(data);

        event.response.status = 202;

        return result;
    }
}
