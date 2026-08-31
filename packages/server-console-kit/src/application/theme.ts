/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import fs from 'node:fs';
import type { IModule } from 'orkos';
import { ThemeProvider } from '../theme/index';
import type { IThemeProvider } from '../theme/index';
import { InjectionKey, ModuleName } from './constants';
import type { Config } from './types';

/**
 * The operator theme, if one is configured.
 *
 * A missing directory disables the feature entirely: no provider, no route,
 * and a served shell byte-identical to an un-themed one. So the default
 * configuration pays nothing.
 */
export async function createThemeProvider(
    config: Config,
) : Promise<IThemeProvider | undefined> {
    if (!config.theme.directoryPath || !fs.existsSync(config.theme.directoryPath)) {
        return undefined;
    }

    const provider = new ThemeProvider({
        directoryPath: config.theme.directoryPath,
        fragmentsEnabled: config.theme.fragmentsEnabled,
        // The boot inventory this logs (resolved path, token counts, every
        // servable file) is the antidote to the feature's dominant failure
        // mode, which is silence.
        logger: console,
    });

    await provider.load();

    return provider;
}

/**
 * A module rather than a step inside the handler, because loading a theme is
 * a real dependency edge: it reads the filesystem, an invalid manifest has to
 * fail the BOOT rather than every render, and the listener must not start
 * before it settles. Declaring it makes that order the graph's business.
 *
 * It also makes the provider injectable: a spec registers a fake and the
 * module steps aside, the same seam the configuration has.
 */
export class ThemeModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.THEME;
        this.dependencies = [ModuleName.CONFIG];
    }

    async setup(container: IContainer): Promise<void> {
        if (container.has(InjectionKey.Theme)) {
            return;
        }

        const config = container.resolve(InjectionKey.Config);

        container.register(InjectionKey.Theme, { useValue: await createThemeProvider(config) });
    }
}
