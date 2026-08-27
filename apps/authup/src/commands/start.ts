/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { Container } from 'eldin';
import type { AuthupConfig, ConfigReadFsOptions } from '@authup/server-config';
import {
    ConfigModule,
    HTTPInjectionKey,
    createApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import { readConsoleConfigs } from '../roles/config.ts';
import { createAuthConsoleHandler } from '@authup/server-auth-console';
import { createAdminConsoleHandler } from '@authup/server-admin-console';
import { createAccountConsoleHandler } from '@authup/server-account-console';


export function defineCLIStartCommand(
    configFs: ConfigReadFsOptions<AuthupConfig> = {},
) {
    return defineCommand({
        meta: { name: 'start' },
        async setup() {
            const serverCoreConfig = await readConfig({
                env: true,
                fs: { ...configFs },
            });

            const container = new Container();

            const app = createApplication({
                config: new ConfigModule(
                    serverCoreConfig,
                ),
                container,
            });

            await app.setup();

            const routup = container.resolve(HTTPInjectionKey.App);

            const consoles = await readConsoleConfigs(configFs);

            // authConsole
            routup.use(
                consoles.auth.url,
                await createAuthConsoleHandler(consoles.auth),
            );

            if (consoles.admin.enabled) {
                routup.use(
                    consoles.admin.url,
                    await createAdminConsoleHandler(consoles.admin),
                );
            }

            if (consoles.account.enabled) {
                routup.use(
                    consoles.account.url,
                    await createAccountConsoleHandler(consoles.account),
                );
            }


            registerShutdownHandlers(app);
        },
    });
}
