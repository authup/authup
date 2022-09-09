/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Transporter } from 'nodemailer';
import { createSmtpClient } from './module';
import { useSmtpConfig } from './config';

let instance : Transporter | undefined;

export function useSMTPClient() : Transporter {
    if (typeof instance === 'undefined') {
        return instance;
    }

    const options = useSmtpConfig();
    instance = createSmtpClient(options);

    return instance;
}
