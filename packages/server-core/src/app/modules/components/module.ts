/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';
import type { Component } from '../../../components';
import { createDatabaseUniqueEntriesComponent, createOAuth2CleanerComponent } from '../../../components';
import type { DependencyContainer } from '../../../core';
import { DatabaseInjectionKey } from '../database';
import type { ApplicationModule } from '../types';

export class ComponentsModule implements ApplicationModule {
    protected container : DependencyContainer;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const dataSource = this.container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

        const components: Component[] = [
            createOAuth2CleanerComponent(dataSource),
            createDatabaseUniqueEntriesComponent(dataSource),
        ];

        components.forEach((component) => component.start());
    }

    // ----------------------------------------------------
}
