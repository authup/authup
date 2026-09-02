/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Where the search for a hot-module-replacement socket starts.
 *
 * One websocket per dev server, because middleware mode cannot share the
 * listener: the console mounts are built inside server-core's `mount` hook,
 * which fires before the http server exists.
 *
 * A PREFERENCE, not an assignment. 24678 is vite's own default, so it is the
 * port most likely to be held already by an unrelated vite project, and
 * refusing to start over that would be poor advice. Each dev server takes the
 * first free port from here upward, so with nothing else running the three
 * consoles still land on 24678, 24679 and 24680.
 */
export const HMR_PORT_BASE = 24678;

/**
 * How far above the base to look before giving up. Exhausting it means
 * something is very wrong with the machine, so it fails loudly rather than
 * falling back to a random high port a developer would have to hunt for.
 */
export const HMR_PORT_RANGE : [number, number] = [HMR_PORT_BASE, HMR_PORT_BASE + 100];
