/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Transporter, createTransport } from 'nodemailer';
import { SMTPOptionsInput, buildSMTPOptions } from '../config';
import { useLogger } from '../logger';

export function createSMTPClient(input: SMTPOptionsInput) : Transporter {
    const config = buildSMTPOptions(input);

    let auth: Record<string, any> | undefined;
    if (config.user && config.password) {
        auth = {
            type: 'login',
            user: config.user,
            pass: config.password,
        };
    }

    const transport = createTransport({
        host: config.host,
        port: config.port,
        auth,
        secure: config.ssl,
        opportunisticTLS: config.starttls,
        tls: {
            rejectUnauthorized: false,
        },
    });

    transport.on('error', (e) => {
        useLogger().error(e.message);
    });

    return transport;
}
