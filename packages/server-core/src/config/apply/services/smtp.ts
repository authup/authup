/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SMTPOptions } from '../../../adapters/smtp';
import { createSMTPClient, setSMTPClientFactory } from '../../../adapters/smtp';

export function applyConfigSMTP(
    data: string | boolean | SMTPOptions,
): void {
    /**
     *
     *     client.on('error', (e) => {
     *         useLogger().error(e.message);
     *     });
     */
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            setSMTPClientFactory(() => createSMTPClient());
        }

        return;
    }

    if (typeof data === 'string') {
        setSMTPClientFactory(() => createSMTPClient({
            connectionString: data,
        }));

        return;
    }

    setSMTPClientFactory(() => createSMTPClient(data));
}
