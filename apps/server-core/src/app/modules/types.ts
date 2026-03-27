/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';

export interface IModule {
    readonly name: string;
    readonly dependsOn?: string[];

    start(container: IContainer) : Promise<void>;

    stop?(container: IContainer): Promise<void>
}
