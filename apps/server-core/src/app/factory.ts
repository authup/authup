/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ApplicationBuilder } from './builder.ts';
import {
    DefaultProvisioningSource,
    ProvisionerModule,
} from './modules/index.ts';
import type { CreateApplicationContext } from './types.ts';

export function createApplication(context: CreateApplicationContext = {}) {
    return new ApplicationBuilder()
        .withConfig(context.config)
        .withLogger()
        .withCache()
        .withMail()
        .withRuntime()
        .withDatabase()
        .withProvisioning(new ProvisionerModule([
            new DefaultProvisioningSource(),
        ]))
        .withLdap()
        .withAuthentication()
        .withIdentity()
        .withOAuth2()
        .withComponents()
        .withHTTP()
        .build();
}
