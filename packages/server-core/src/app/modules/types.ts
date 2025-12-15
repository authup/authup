/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IDIContainer } from '../../core/di/types';

export interface Module {
    start(container: IDIContainer) : Promise<void>;

    stop?(container: IDIContainer): Promise<void>
}
