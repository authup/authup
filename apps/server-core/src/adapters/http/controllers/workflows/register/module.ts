/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RegisterPayload, RegisterResponse, StatusResponseFeatures } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { useRequestLocale } from '../../../request/index.ts';
import { serveWorkflowPage } from '../../../ui/index.ts';

export type RegisterControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type RegisterControllerContext = {
    options: RegisterControllerOptions,
    service: IRegistrationService,
};

@DController('/register')
export class RegisterController {
    protected options: RegisterControllerOptions;

    protected service: IRegistrationService;

    constructor(ctx: RegisterControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return serveWorkflowPage(event, {
            url: '/register',
            baseURL: this.options.baseURL,
            features: this.options.features,
            realmAware: true,
        });
    }

    @DPost('', [])
    async execute(
        @DBody() data: RegisterPayload,
        @DContext() event: IAppEvent,
    ): Promise<RegisterResponse> {
        const result = await this.service.register(data, { locale: useRequestLocale(event) });

        event.response.status = 202;

        return result;
    }
}
