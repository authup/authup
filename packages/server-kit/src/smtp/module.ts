/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import type { SmtpConfig } from './type';
import { useLogger } from '../logger';

export function createSmtpClient(options?: SmtpConfig | string) : Transporter {
    let transport : Transporter;

    options = options || {};

    if (typeof options === 'string') {
        transport = createTransport(options);
    } else if (options.connectionString) {
        transport = createTransport(options.connectionString);
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
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    transport.on('error', (e) => {
        useLogger().error(e.message);
    });

    return transport;
}
