/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Transporter } from 'nodemailer';
import type { Module } from '../types';
import { SMTPInjectionKey } from './constants';
import type { Config } from '../../../config';
import { ConfigInjectionKey } from '../config';
import type { SMTPOptions } from '../../../adapters/smtp';
import { createSMTPClient, setSMTPClientFactory } from '../../../adapters/smtp';
import type { IDIContainer } from '../../../core/di/types';

export class SMTPModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const result = container.safeResolve<Config>(ConfigInjectionKey);
        if (!result.success || !result.data.smtp) {
            return;
        }

        container.register(SMTPInjectionKey, {
            useFactory: () => this.createClient(result.data.smtp),
        });

        // todo: remove this
        setSMTPClientFactory(() => this.createClient(result.data.smtp));
    }

    // ----------------------------------------------------

    protected createClient(data: string | boolean | SMTPOptions) : Transporter {
        if (typeof data === 'boolean') {
            return createSMTPClient();
        }

        if (typeof data === 'string') {
            return createSMTPClient({
                connectionString: data,
            });
        }

        return createSMTPClient(data);
    }
}
