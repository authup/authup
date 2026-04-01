/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordForgotResponse } from '@authup/core-http-kit';
import {
    DBody, 
    DController, 
    DPost, 
    DRequest, 
    DResponse,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
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
        @DBody() data: any,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<PasswordForgotResponse> {
        const result = await this.service.forgotPassword(data);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return sendAccepted(res, result);
    }
}
