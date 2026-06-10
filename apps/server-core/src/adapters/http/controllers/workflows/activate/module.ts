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
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { ActivatePayload, StatusResponseFeatures } from '@authup/core-http-kit';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { serveWorkflowPage } from '../../../ui/index.ts';
import { ActivateRequestValidator } from './validator.ts';

export type ActivateControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type ActivateControllerContext = {
    options: ActivateControllerOptions,
    service: IRegistrationService,
};

@DController('/activate')
export class ActivateController {
    protected options: ActivateControllerOptions;

    protected service: IRegistrationService;

    constructor(ctx: ActivateControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return serveWorkflowPage(event, {
            url: '/activate',
            baseURL: this.options.baseURL,
            features: this.options.features,
            tokenAware: true,
        });
    }

    @DPost('', [])
    async execute(
        @DBody() data: ActivatePayload,
        @DContext() event: IAppEvent,
    ): Promise<null> {
        const validator = new ActivateRequestValidator();
        const validated = await validator.run(data);

        await this.service.activate(validated);

        event.response.status = 202;
        return null;
    }
}
