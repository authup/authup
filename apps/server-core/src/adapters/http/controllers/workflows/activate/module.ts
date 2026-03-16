/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
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
        @DBody() data: any,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<any> {
        const validator = new ActivateRequestValidator();
        const validated = await validator.run(data);

        await this.service.activate(validated);

        return sendAccepted(res);
    }
}
