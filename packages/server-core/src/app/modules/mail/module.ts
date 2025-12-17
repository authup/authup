/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Module } from '../types';
import { SMTPMailClientAdapter, VoidMailClientAdapter } from './adapter';
import { MailInjectionKey } from './constants';
import type { Config } from '../../../config';
import { ConfigInjectionKey } from '../config';
import type { IDIContainer } from '../../../core';

export class MailModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const result = container.safeResolve<Config>(ConfigInjectionKey);
        if (!result.success || !result.data.smtp) {
            container.register(MailInjectionKey, {
                useFactory: () => new VoidMailClientAdapter(),
            });

            return;
        }

        container.register(MailInjectionKey, {
            useFactory: () => new SMTPMailClientAdapter(result.data.smtp),
        });
    }
}
