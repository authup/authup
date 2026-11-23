/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from 'vue';

export type MountPageOptions = {
    /**
     * What renders the routed page, instead of a bare `RouterView`: a layout,
     * for a spec about how the layout hosts the page.
     */
    root?: Component,
    stubs?: Record<string, boolean | Component>,
};
