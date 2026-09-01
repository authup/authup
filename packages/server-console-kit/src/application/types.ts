/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp } from 'routup';
import type { IThemeProvider } from '../theme/index';

/**
 * Structural rather than `ReturnType<typeof serve>`: that type reaches into
 * routup's own srvx copy, which a consumer's declarations cannot name
 * portably. Three members is the whole of what the graph uses.
 */
export type HTTPServer = {
    readonly url?: string,
    ready(): Promise<unknown>,
    close(closeActiveConnections?: boolean): Promise<unknown>,
};

/**
 * What the modules below need of a console's configuration. Each console's
 * own `Config` carries more (its api url, its dist path, its theme), which is
 * its handler's business rather than the graph's.
 */
export type Config = {
    port: number,
    host: string,
    theme: {
        directoryPath: string,
        fragmentsEnabled: boolean,
    },
};

export type ConfigFactory<C extends Config = Config> =    () => C | Promise<C>;

export type HTTPModuleContext<C extends Config = Config> = {
    /**
     * Built on setup rather than passed in, because a console loads its
     * operator theme before it serves a page: an invalid manifest then fails
     * the boot instead of every render.
     */
    createHandler: (config: C, theme?: IThemeProvider) => Promise<IApp>,
};

/**
 * Everything a console application is composed from. One context rather than
 * a config argument plus an options bag: both are configuration of the same
 * graph, and the shape then matches server-core's own `createApplication`.
 */
export type CreateApplicationContext<C extends Config = Config> = HTTPModuleContext<C> & {
    /**
     * `false` builds the console fully and registers its app under
     * {@link InjectionKey.App} WITHOUT a listener, which is how a composing
     * caller puts it on someone else's.
     *
     * Not a lifecycle split: the application is completely set up either way,
     * it just does not own the socket. That is what lets `authup start` run
     * the same module graph `authup console` and the per-console bin run,
     * instead of reaching past it for a bare handler.
     */
    listen?: boolean,
    /**
     * A FACTORY is the useful form: resolving reads the document, and a
     * console started alongside others must not do that at construction time,
     * before the caller has said where to look.
     */
    config: C | ConfigFactory<C>,
};
