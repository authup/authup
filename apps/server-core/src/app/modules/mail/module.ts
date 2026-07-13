/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { MailTemplateRenderer } from '../../../core/index.ts';
import { SMTPMailClientAdapter, VoidMailClientAdapter } from './adapter/index.ts';
import { MailInjectionKey, MailTemplateRendererInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IContainer } from 'eldin';

export class MailModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.MAIL;
        this.dependencies = [ModuleName.CONFIG];
    }

    async setup(container: IContainer): Promise<void> {
        if (!container.has(MailTemplateRendererInjectionKey)) {
            container.register(MailTemplateRendererInjectionKey, { useFactory: () => new MailTemplateRenderer() });
        }

        // A pre-registered client wins (test injection — mirrors the
        // UIHttpClient pattern), so a fake can capture mailed OTP codes.
        if (container.has(MailInjectionKey)) {
            return;
        }

        const result = container.tryResolve(ConfigInjectionKey);
        if (!result.success || !result.data.smtp) {
            container.register(MailInjectionKey, { useFactory: () => new VoidMailClientAdapter() });

            return;
        }

        container.register(MailInjectionKey, { useFactory: () => new SMTPMailClientAdapter(result.data.smtp) });
    }
}
