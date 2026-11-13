/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Transporter } from 'nodemailer';
import type { IMailClient, MailSendOptions } from '../../../../../core/index.ts';
import { SMTP_SEND_TIMEOUT } from './constants.ts';
import { createSMTPClient } from './module.ts';
import type { SMTPOptions } from './types.ts';

export class SMTPMailClientAdapter implements IMailClient {
    protected transporter : Transporter;

    constructor(input: string | boolean | SMTPOptions) {
        this.transporter = this.createDriver(input);
    }

    protected createDriver(input: string | boolean | SMTPOptions) : Transporter {
        if (typeof input === 'boolean') {
            return createSMTPClient();
        }

        if (typeof input === 'string') {
            return createSMTPClient({ connectionString: input });
        }

        return createSMTPClient(input);
    }

    async send(options: MailSendOptions): Promise<any> {
        // The transport's own timeouts are per phase and idle-based (up to
        // ten minutes of socket silence), and the workflows await the send
        // inside the request, so every send gets one overall deadline.
        return this.transporter.sendMail({
            ...options,
            signal: options.signal ?? AbortSignal.timeout(SMTP_SEND_TIMEOUT),
        });
    }
}
