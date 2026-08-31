/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp } from 'routup';

/**
 * Structural rather than `ReturnType<typeof serve>`: that type reaches into
 * routup's own srvx copy, which a consumer's declarations cannot name
 * portably. Three members is the whole of what the graph uses.
 */
export type ConsoleServer = {
    readonly url?: string,
    ready(): Promise<unknown>,
    close(closeActiveConnections?: boolean): Promise<unknown>,
};

/**
 * What the modules below need of a console's configuration. Each console's
 * own `Config` carries more (its api url, its dist path, its theme), which is
 * its handler's business rather than the graph's.
 */
export type ConsoleConfig = {
    port: number,
    host: string,
};

export type ConsoleConfigFactory<C extends ConsoleConfig = ConsoleConfig> =    () => C | Promise<C>;

export type ConsoleHTTPModuleContext<C extends ConsoleConfig = ConsoleConfig> = {
    /**
     * Built on setup rather than passed in, because a console loads its
     * operator theme before it serves a page: an invalid manifest then fails
     * the boot instead of every render.
     */
    createHandler: (config: C) => Promise<IApp>,
};
