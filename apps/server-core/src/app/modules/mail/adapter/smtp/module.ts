/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createTransport } from 'nodemailer';
import type { SMTPClient, SMTPOptions } from './types.ts';

export function createSMTPClient(options?: SMTPOptions | string) : SMTPClient {
    let transport : SMTPClient;

    options = options || {};

    if (typeof options === 'string') {
        transport = createTransport(options);
    } else if (options.connectionString) {
        transport = createTransport({
            url: options.connectionString,
            tls: { rejectUnauthorized: options.rejectUnauthorized ?? true },
        });
    } else {
        let auth: Record<string, any> | undefined;
        if (options.user && options.password) {
            auth = {
                type: 'login',
                user: options.user,
                pass: options.password,
            };
        }

        transport = createTransport({
            host: options.host,
            port: options.port,
            auth,
            secure: options.ssl,
            opportunisticTLS: options.starttls,
            tls: { rejectUnauthorized: options.rejectUnauthorized ?? true },
        });
    }

    return transport;
}
