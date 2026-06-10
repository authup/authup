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
import { useRequestQuery } from '@routup/basic/query';
import type { IRegistrationService } from '../../../../../core/index.ts';
import { renderUIPage, sanitizeRelativeRedirect } from '../../../ui/index.ts';

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
        const query = useRequestQuery(event);

        return renderUIPage(event, {
            url: '/register',
            payload: {
                config: { baseURL: this.options.baseURL },
                data: {
                    features: this.options.features,
                    realmId: typeof query.realm_id === 'string' ? query.realm_id : undefined,
                    redirect: sanitizeRelativeRedirect(query.redirect),
                },
            },
        });
    }

    @DPost('', [])
    async execute(
        @DBody() data: RegisterPayload,
        @DContext() event: IAppEvent,
    ): Promise<RegisterResponse> {
        const result = await this.service.register(data);

        event.response.status = 202;

        return result;
    }
}
