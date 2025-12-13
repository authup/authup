/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components';
import { createDatabaseUniqueEntriesComponent, createOAuth2CleanerComponent } from '../../../components';
import type { ModuleContextContainer } from '../context';
import type { ApplicationModule } from '../types';

export class ComponentsModule implements ApplicationModule {
    protected container : ModuleContextContainer;

    // ----------------------------------------------------

    constructor(container: ModuleContextContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const components: Component[] = [
            createOAuth2CleanerComponent(),
            createDatabaseUniqueEntriesComponent(),
        ];

        components.forEach((component) => component.start());
    }

    // ----------------------------------------------------
}
