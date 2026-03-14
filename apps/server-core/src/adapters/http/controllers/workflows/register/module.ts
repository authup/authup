/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RegisterResponse } from '@authup/core-http-kit';
import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { useRequestBody } from '@routup/basic/body';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { IRegistrationService } from '../../../../../core/index.ts';

export type RegisterControllerContext = {
    service: IRegistrationService,
};

@DController('/register')
export class RegisterController {
    protected service: IRegistrationService;

    constructor(ctx: RegisterControllerContext) {
        this.service = ctx.service;
    }

    @DPost('', [])
    async execute(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<RegisterResponse> {
        const result = await this.service.register(useRequestBody(req));

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return sendAccepted(res, result);
    }
}
