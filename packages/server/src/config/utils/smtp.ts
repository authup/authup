/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SmtpConfig } from '@authup/server-common';
import { setSmtpConfig } from '@authup/server-common';

export function setupSmtp(data: string | boolean | SmtpConfig): void {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            setSmtpConfig({});
        }

        return;
    }

    if (typeof data === 'string') {
        setSmtpConfig({
            connectionString: data,
        });

        return;
    }

    setSmtpConfig(data);
}
