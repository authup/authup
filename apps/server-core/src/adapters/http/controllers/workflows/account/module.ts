/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';
import {
    DContext,
    DController,
    DGet,
    DPath,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { serveWorkflowPage } from '../../../ui/index.ts';

export type AccountControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type AccountControllerContext = {
    options: AccountControllerOptions,
};

const PAGE_PATTERN = /^[a-z0-9-]+$/;

@DController('/account')
export class AccountController {
    protected options: AccountControllerOptions;

    constructor(ctx: AccountControllerContext) {
        this.options = ctx.options;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event, '/account');
    }

    @DGet('/:page', [])
    async servePage(
        @DPath('page') page: string,
        @DContext() event: IAppEvent,
    ): Promise<string> {
        const url = PAGE_PATTERN.test(page) ? `/account/${page}` : '/account';

        return this.render(event, url);
    }

    protected render(event: IAppEvent, url: string): Promise<string> {
        return serveWorkflowPage(event, {
            url,
            baseURL: this.options.baseURL,
            features: this.options.features,
            realmAware: true,
        });
    }
}
