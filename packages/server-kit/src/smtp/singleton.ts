/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Transporter } from 'nodemailer';
import { createTestAccount } from 'nodemailer';
import { createSmtpClient } from './module';
import { useSmtpConfig } from './config';
import type { SmtpConfig } from './type';

let instance : Transporter | undefined;

export async function useSMTPClient() : Promise<Transporter> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    let options : SmtpConfig | string;
    if (process.env.NODE_ENV === 'test') {
        const testAccount = await createTestAccount();

        options = {
            host: 'smtp.ethereal.email',
            port: 587,
            ssl: false,
            user: testAccount.user,
            password: testAccount.pass,
        };
    } else {
        options = useSmtpConfig();
    }

    instance = createSmtpClient(options);

    return instance;
}
