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
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { serveAccountConsolePage } from '../../../ui/index.ts';

export type AccountControllerOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

export type AccountControllerContext = {
    options: AccountControllerOptions,
};

/**
 * Serves the account console SPA (`@authup/client-account-console`) shell —
 * client-side routing owns the sub-paths, so every route returns the same
 * shell with the runtime config (apiUrl, base path, feature flags) injected.
 * The bundle's static assets ride the assets middleware (/account/assets).
 */
@DController('/account')
export class AccountController {
    protected options: AccountControllerOptions;

    constructor(ctx: AccountControllerContext) {
        this.options = ctx.options;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    @DGet('/:page', [])
    async servePage(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    protected render(event: IAppEvent): Promise<string> {
        return serveAccountConsolePage(event, {
            baseURL: this.options.baseURL,
            features: this.options.features,
        });
    }
}
