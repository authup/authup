/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import type { IModule } from 'orkos';
import { ConsoleInjectionKey, ConsoleModuleName } from './constants';
import type { ConsoleConfig, ConsoleConfigFactory } from './types';

/**
 * A console's own configuration, resolved once and shared with every module
 * that needs it.
 *
 * A factory rather than a value is the useful form: resolving reads the
 * document, and a console that is one of several started in one process must
 * not do that at construction time, before the CLI has told it where to look.
 *
 * An already-registered token wins, which is the test seam: a spec registers
 * a configuration and the module steps aside rather than reading a file.
 */
export class ConsoleConfigModule<C extends ConsoleConfig = ConsoleConfig> implements IModule {
    readonly name: string;

    protected input : C | ConsoleConfigFactory<C>;

    constructor(input: C | ConsoleConfigFactory<C>) {
        this.name = ConsoleModuleName.CONFIG;
        this.input = input;
    }

    async setup(container: IContainer): Promise<void> {
        if (container.has(ConsoleInjectionKey.Config)) {
            return;
        }

        const config = typeof this.input === 'function' ?
            await (this.input as ConsoleConfigFactory<C>)() :
            this.input;

        container.register(ConsoleInjectionKey.Config, { useValue: config });
    }
}
