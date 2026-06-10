/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponse } from '@authup/core-http-kit';
import {
    DController,
    DGet,
} from '@routup/decorators';
import { load } from 'locter';
import path from 'node:path';
import { PACKAGE_PATH } from '../../../../../path.ts';

export type StatusControllerOptions = {
    registrationEnabled: boolean,
    passwordRecoveryEnabled: boolean,
    emailVerificationEnabled: boolean,
};

export type StatusControllerContext = {
    options: StatusControllerOptions,
};

@DController('')
export class StatusController {
    protected options: StatusControllerOptions;

    constructor(ctx: StatusControllerContext) {
        this.options = ctx.options;
    }

    @DGet('/', [])
    async status(): Promise<StatusResponse> {
        const pkgJson = await load(path.join(PACKAGE_PATH, 'package.json'));
        const isoDate = new Date().toISOString();

        return {
            version: pkgJson.version,
            date: isoDate,
            features: {
                registration: this.options.registrationEnabled,
                passwordRecovery: this.options.passwordRecoveryEnabled,
                emailVerification: this.options.emailVerificationEnabled,
            },
        };
    }
}
