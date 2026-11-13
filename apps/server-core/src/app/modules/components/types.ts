/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HealthReport } from '../http/health/types.ts';

export type ComponentsModuleOptions = {
    /**
     * Refuse to boot when `core.worker.enabled` is false instead of skipping
     * the components. Worker mode sets it: a process started for nothing but
     * the sweeps must not come up doing nothing.
     *
     * default: false
     */
    required?: boolean
};

export type ComponentHealth = {
    name: string,
    /** ISO timestamp of the last successful pass, null before the first. */
    lastSuccessAt: string | null,
    /** ISO timestamp the pass in flight started at, null while idle. */
    runningSince: string | null,
    overdue: boolean,
    /** A pass has been running longer than COMPONENT_HUNG_AFTER. */
    hung: boolean,
};

export type ComponentsHealth = {
    healthy: boolean,
    /** At least one component is hung, which only a restart remedies. */
    hung: boolean,
    components: ComponentHealth[],
};

export type WorkerHealthReport = HealthReport & {
    /** Per-component detail, on the readiness answer only. */
    components?: ComponentHealth[],
};
