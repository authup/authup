/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp } from 'routup';

export type ConsoleApplicationContext = {
    /** what the process logs itself as, e.g. `admin console` */
    name: string,
    port: number,
    host: string,
    /**
     * Built on setup rather than passed in, because a console loads its
     * operator theme before it serves a page: an invalid manifest then fails
     * the boot instead of every render.
     */
    createHandler: () => Promise<IApp>,
};

/**
 * A console as a runnable SERVICE rather than a handler someone else mounts.
 *
 * Structurally typed on purpose. It is what `registerShutdownHandlers` needs
 * and what a composing caller needs, and nothing more, so a console owes no
 * dependency on a module framework to be started alongside server-core. The
 * day a console has a second module worth ordering, this becomes an orkos
 * Application and every caller keeps compiling.
 */
export type ConsoleApplication = {
    setup(): Promise<void>,
    teardown(): Promise<void>,
    readonly url: string | undefined,
};
