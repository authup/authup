/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PasswordResetPayload, PasswordResetResponse, StatusResponseFeatures } from '@authup/core-http-kit';
import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';
import { serveWorkflowPage } from '../../../ui/index.ts';

export type PasswordResetControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type PasswordResetControllerContext = {
    options: PasswordResetControllerOptions,
    service: IPasswordRecoveryService,
};

@DController('/password-reset')
export class PasswordResetController {
    protected options: PasswordResetControllerOptions;

    protected service: IPasswordRecoveryService;

    constructor(ctx: PasswordResetControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return serveWorkflowPage(event, {
            url: '/password-reset',
            baseURL: this.options.baseURL,
            features: this.options.features,
            realmAware: true,
            tokenAware: true,
        });
    }

    @DPost('', [])
    async execute(
        @DBody() data: PasswordResetPayload,
        @DContext() event: IAppEvent,
    ): Promise<PasswordResetResponse> {
        const result = await this.service.resetPassword(data);

        event.response.status = 202;

        return result;
    }
}
