/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';
import type { Component } from '../../../components/index.ts';
import { createDatabaseUniqueEntriesComponent, createOAuth2CleanerComponent } from '../../../components/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import type { Module } from '../types.ts';
import type { IDIContainer } from '../../../core/index.ts';

export class ComponentsModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

        const components: Component[] = [
            createOAuth2CleanerComponent(dataSource),
            createDatabaseUniqueEntriesComponent(dataSource),
        ];

        components.forEach((component) => component.start());
    }

    // ----------------------------------------------------
}
