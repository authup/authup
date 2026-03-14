/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IDIContainer } from '../core/di/types.ts';
import type { Module } from './modules/index.ts';

export interface IApplication {
    readonly container: IDIContainer;

    addModule(module: Module): void;
    addModules(modules: Module[]): void;

    start(): Promise<void>;
    stop(): Promise<void>;
    reset(): Promise<void>;
}
