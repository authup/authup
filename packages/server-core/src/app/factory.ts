/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DependencyContainer } from '../core';
import { Application } from './module';
import {
    type ApplicationModuleContext,
    DIModule,
    DatabaseModule,
    HTTPModule,
    RuntimeModule, SwaggerModule,
} from './modules';

export function createApplication(container: DependencyContainer<ApplicationModuleContext>) {
    return new Application(container, [
        new RuntimeModule(container),
        new SwaggerModule(container),
        new DatabaseModule(container),
        new DIModule(container),
        new HTTPModule(container),
    ]);
}
