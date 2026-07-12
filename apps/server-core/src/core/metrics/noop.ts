/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAuthFlowMetrics } from './types.ts';

export class NoopAuthFlowMetrics implements IAuthFlowMetrics {
    recordLogin(): void {
        // noop
    }

    recordTokenGrant(): void {
        // noop
    }

    recordAuthorize(): void {
        // noop
    }

    recordRefreshReplay(): void {
        // noop
    }
}
