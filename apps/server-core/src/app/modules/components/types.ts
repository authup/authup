/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ComponentsModuleOptions = {
    /**
     * Register and start the background components even when the
     * componentsEnabled config key is false. The worker role sets it, so a
     * shared environment block can disable the components on every API
     * replica while the worker keeps running them.
     *
     * default: false
     */
    force?: boolean
};
