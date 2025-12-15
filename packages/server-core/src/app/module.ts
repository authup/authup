/*
 * Copyright (c) 2024-2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DependencyContainer } from '../core';
import type { ApplicationModule } from './modules';

export class Application {
    public readonly container: DependencyContainer;

    public readonly modules: ApplicationModule[];

    // ----------------------------------------------------

    constructor(
        container: DependencyContainer,
        modules: ApplicationModule[],
    ) {
        this.container = container;
        this.modules = modules;
    }

    // ----------------------------------------------------

    async start() {
        for (let i = 0; i < this.modules.length; i++) {
            const module = this.modules[i];

            await module.start();
        }
    }

    async stop() {
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const module = this.modules[i];

            await module.stop?.();
        }
    }

    async reset() {
        // todo.
    }
}
