/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import type { IDIContainer } from '../../../../core/di/types';

export class HTTPControllerModule {
    async mount(router: Router, container: IDIContainer): Promise<void> {
        return Promise.resolve(undefined);
    }
}
