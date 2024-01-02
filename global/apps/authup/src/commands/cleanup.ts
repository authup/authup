/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import { executeServicesCommand } from '../services/execute';
import { ServiceCommand } from '../services';

export function buildCleanupCommand(cac: CAC) {
    cac
        .command('cleanup [...services]', 'Cleanup a service')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (keysInput: string[], ctx: Record<string, any>) => {
            const servicesAllowed = ['server/core'];

            if (!keysInput || keysInput.length === 0) {
                keysInput = servicesAllowed;
            }

            await executeServicesCommand({
                config: ctx.config,
                command: ServiceCommand.CLEANUP,
                services: keysInput,
                servicesAllowed,
            });
        });
}
