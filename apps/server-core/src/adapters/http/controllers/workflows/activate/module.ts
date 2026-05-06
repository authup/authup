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
    DPost,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
import type { ActivateInput } from '@authup/core-http-kit';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { ActivateRequestValidator } from './validator.ts';

export type ActivateControllerContext = {
    service: IRegistrationService,
};

@DController('/activate')
export class ActivateController {
    protected service: IRegistrationService;

    constructor(ctx: ActivateControllerContext) {
        this.service = ctx.service;
    }

    @DPost('', [])
    async execute(
        @DBody() data: ActivateInput,
        @DContext() event: IRoutupEvent,
    ): Promise<null> {
        const validator = new ActivateRequestValidator();
        const validated = await validator.run(data);

        await this.service.activate(validated);

        event.response.status = 202;
        return null;
    }
}
