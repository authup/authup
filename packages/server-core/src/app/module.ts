/*
 * Copyright (c) 2024-2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { DependencyContainer } from '../core';
import type { Module } from './modules';
import type { IDIContainer } from '../core/di/types';

export class Application {
    public readonly container: IDIContainer;

    public readonly modules: Module[];

    // ----------------------------------------------------

    constructor(
        modules: Module[],
    ) {
        this.container = new DependencyContainer();
        this.modules = modules;
    }

    // ----------------------------------------------------

    async start() : Promise<void> {
        for (let i = 0; i < this.modules.length; i++) {
            const module = this.modules[i];

            await module.start(this.container);
        }
    }

    async stop() : Promise<void> {
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const module = this.modules[i];

            await module.stop?.(this.container);
        }
    }

    async reset() : Promise<void> {
        // todo.
    }
}
