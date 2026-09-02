/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
