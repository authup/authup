/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';
import { Application } from '../../src';
import { DatabaseInjectionKey } from '../../src/app';

export class TestApplication extends Application {
    get dataSource(): DataSource {
        return this.container.resolve(DatabaseInjectionKey.DataSource);
    }
}
