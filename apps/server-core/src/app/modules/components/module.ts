/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components/index.ts';
import {
    createAuditEventCleanerComponent,
    createDatabaseUniqueEntriesComponent,
    createOAuth2CleanerComponent,
} from '../../../components/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';

export class ComponentsModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.COMPONENTS;
        this.dependencies = [ModuleName.CONFIG, ModuleName.DATABASE];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);

        const components: Component[] = [
            createOAuth2CleanerComponent(dataSource),
            createDatabaseUniqueEntriesComponent(dataSource),
        ];

        // The sweep only exists when rows are written AND carry an expiry —
        // with retention 0 (keep forever) every expires_at is null anyway.
        if (config.auditLogEnabled && config.auditLogRetentionDays > 0) {
            components.push(createAuditEventCleanerComponent(dataSource));
        }

        components.forEach((component) => component.start());
    }

    // ----------------------------------------------------
}
