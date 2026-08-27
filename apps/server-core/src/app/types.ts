/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigModule } from './modules/index.ts';
import type { IModule } from 'orkos';
import type { IContainer } from 'eldin';

export type CreateApplicationContext = {
    container?: IContainer,
    config?: ConfigModule,
    http?: IModule
};
