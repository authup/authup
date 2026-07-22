/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponse, StatusResponseFeatures } from '@authup/core-http-kit';
import {
    DController,
    DGet,
} from '@routup/decorators';
import { read } from 'locter';
import path from 'node:path';
import { PACKAGE_PATH } from '../../../../../path.ts';

export type StatusControllerOptions = {
    features: StatusResponseFeatures,
};

export type StatusControllerContext = {
    options: StatusControllerOptions,
};

@DController('')
export class StatusController {
    protected options: StatusControllerOptions;

    // The version is constant for the process lifetime — read package.json
    // once and memoize instead of on every GET /.
    protected versionPromise: Promise<string> | undefined;

    constructor(ctx: StatusControllerContext) {
        this.options = ctx.options;
    }

    protected resolveVersion(): Promise<string> {
        if (!this.versionPromise) {
            this.versionPromise = read(path.join(PACKAGE_PATH, 'package.json'))
                .then((pkgJson: { version: string }) => pkgJson.version);
        }

        return this.versionPromise;
    }

    @DGet('/', [])
    async status(): Promise<StatusResponse> {
        return {
            version: await this.resolveVersion(),
            date: new Date().toISOString(),
            features: this.options.features,
        };
    }
}
