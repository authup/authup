/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components/index.ts';
import { createDatabaseUniqueEntriesComponent, createOAuth2CleanerComponent } from '../../../components/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';

export class ComponentsModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.COMPONENTS;
        this.dependencies = [ModuleName.DATABASE];
    }

    async setup(container: IContainer): Promise<void> {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);

        const components: Component[] = [
            createOAuth2CleanerComponent(dataSource),
            createDatabaseUniqueEntriesComponent(dataSource),
        ];

        components.forEach((component) => component.start());
    }

    // ----------------------------------------------------
}
