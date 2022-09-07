/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Transporter, createTransport } from 'nodemailer';
import { SMTPConfigInput } from './type';
import { buildSMTPConfig } from './utils';
import { useLogger } from '../config';

export function createSMTPClient(input: SMTPConfigInput) : Transporter {
    const config = buildSMTPConfig(input);

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
