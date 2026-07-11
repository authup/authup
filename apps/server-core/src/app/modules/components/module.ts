/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components/index.ts';
import {
    createDatabaseUniqueEntriesComponent,
    createEventCleanerComponent,
    createOAuth2CleanerComponent,
} from '../../../components/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';

export class ComponentsModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.COMPONENTS;
        this.dependencies = [ModuleName.CONFIG, ModuleName.LOGGER, ModuleName.DATABASE];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const logger = container.resolve(LoggerInjectionKey);

        const components: Component[] = [
            createOAuth2CleanerComponent(dataSource, logger),
            createDatabaseUniqueEntriesComponent(dataSource),
        ];

        // The sweep only exists when rows are written AND carry an expiry —
        // with retention 0 (keep forever) every expires_at is null anyway.
        if (config.eventLogEnabled && config.eventLogRetentionDays > 0) {
            components.push(createEventCleanerComponent(dataSource, logger));
        }

        // start() is deliberately fire-and-forget, so a rejection must be
        // caught here — an unhandled rejection is fatal on modern node.
        components.forEach((component) => {
            component.start().catch((e) => {
                logger.error('Starting a background component failed.');
                logger.error(e);
            });
        });
    }

    // ----------------------------------------------------
}
