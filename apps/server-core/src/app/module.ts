/*
 * Copyright (c) 2024-2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { DependencyContainer } from '../core/index.ts';
import type { Module } from './modules/index.ts';
import type { IDIContainer } from '../core/di/types.ts';
import type { IApplication } from './types.ts';

export class Application implements IApplication {
    public readonly container: IDIContainer;

    protected modules: Map<string, Module>;

    protected startOrder: Module[];

    // ----------------------------------------------------

    constructor(
        modules: Module[] = [],
    ) {
        this.container = new DependencyContainer();
        this.modules = new Map();
        this.startOrder = [];

        modules.forEach((module) => this.addModule(module));
    }

    // ----------------------------------------------------

    addModule(module: Module): void {
        this.modules.set(module.name, module);
    }

    addModules(modules: Module[]): void {
        modules.forEach((module) => this.addModule(module));
    }

    // ----------------------------------------------------

    async start() : Promise<void> {
        this.startOrder = this.resolveOrder();

        for (let i = 0; i < this.startOrder.length; i++) {
            await this.startOrder[i].start(this.container);
        }
    }

    async stop() : Promise<void> {
        for (let i = this.startOrder.length - 1; i >= 0; i--) {
            await this.startOrder[i].stop?.(this.container);
        }
    }

    async reset() : Promise<void> {
        // todo.
    }

    // ----------------------------------------------------

    protected resolveOrder(): Module[] {
        const names = [...this.modules.keys()];
        const registered = new Set(names);
        const inDegree = new Map<string, number>();
        const adjacency = new Map<string, string[]>();

        names.forEach((name) => {
            inDegree.set(name, 0);
            adjacency.set(name, []);
        });

        names.forEach((name) => {
            const module = this.modules.get(name)!;
            if (!module.dependsOn) {
                return;
            }

            module.dependsOn.forEach((dep) => {
                if (!registered.has(dep)) {
                    return;
                }

                adjacency.get(dep)!.push(name);
                inDegree.set(name, inDegree.get(name)! + 1);
            });
        });

        const queue: string[] = names.filter((name) => inDegree.get(name) === 0);

        const sorted: Module[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            sorted.push(this.modules.get(current)!);

            const neighbors = adjacency.get(current)!;
            for (const neighbor of neighbors) {
                const newDegree = inDegree.get(neighbor)! - 1;
                inDegree.set(neighbor, newDegree);

                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }

        if (sorted.length !== this.modules.size) {
            const remaining = names
                .filter((name) => !sorted.some((m) => m.name === name));

            throw new AuthupError(
                `Circular module dependency detected involving: ${remaining.join(', ')}`,
            );
        }

        return sorted;
    }
}
