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

export function createApplication() {
    return new ApplicationBuilder()
        .withConfig()
        .withLogger()
        .withCache()
        .withMail()
        .withRuntime()
        .withSwagger()
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
