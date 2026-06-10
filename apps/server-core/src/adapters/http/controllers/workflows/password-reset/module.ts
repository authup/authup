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
import { useRequestQuery } from '@routup/basic/query';
import type { IPasswordRecoveryService } from '../../../../../core/index.ts';
import { renderUIPage, sanitizeRelativeRedirect } from '../../../ui/index.ts';

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
        const query = useRequestQuery(event);

        return renderUIPage(event, {
            url: '/password-reset',
            payload: {
                config: { baseURL: this.options.baseURL },
                data: {
                    features: this.options.features,
                    realmId: typeof query.realm_id === 'string' ? query.realm_id : undefined,
                    token: typeof query.token === 'string' ? query.token : undefined,
                    redirect: sanitizeRelativeRedirect(query.redirect),
                },
            },
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
