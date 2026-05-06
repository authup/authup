/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RegisterInput, RegisterResponse } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DPost,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
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
        @DBody() data: RegisterInput,
        @DContext() event: IRoutupEvent,
    ): Promise<RegisterResponse> {
        const result = await this.service.register(data);

        event.response.status = 202;

        return result;
    }
}
