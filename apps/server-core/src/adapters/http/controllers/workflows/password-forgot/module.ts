/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordForgotPayload, PasswordForgotResponse, StatusResponseFeatures } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';
import { useRequestLocale } from '../../../request/index.ts';
import { serveWorkflowPage } from '../../../ui/index.ts';

export type PasswordForgotControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type PasswordForgotControllerContext = {
    options: PasswordForgotControllerOptions,
    service: IPasswordRecoveryService,
};

@DController('/password-forgot')
export class PasswordForgotController {
    protected options: PasswordForgotControllerOptions;

    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordForgotControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return serveWorkflowPage(event, {
            url: '/password-forgot',
            baseURL: this.options.baseURL,
            features: this.options.features,
            realmAware: true,
        });
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordForgotPayload,
        @DContext() event: IAppEvent,
    ): Promise<PasswordForgotResponse> {
        const result = await this.service.forgotPassword(data, { locale: useRequestLocale(event) });

        event.response.status = 202;

        return result;
    }
}
