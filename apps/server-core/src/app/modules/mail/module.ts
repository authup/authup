/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { SMTPMailClientAdapter, VoidMailClientAdapter } from './adapter/index.ts';
import { MailInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IContainer } from 'eldin';

export class MailModule implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.MAIL;
        this.dependsOn = [ModuleName.CONFIG];
    }

    async start(container: IContainer): Promise<void> {
        const result = container.tryResolve(ConfigInjectionKey);
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
