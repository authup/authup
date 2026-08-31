/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IApp } from 'routup';
import type { ConsoleConfig, ConsoleServer } from './types';

export enum ConsoleModuleName {
    CONFIG = 'config',
    HTTP = 'http',
}

/**
 * A pre-registered token WINS over the module that would otherwise register
 * it, the same seam server-core carries: a console's tests inject a
 * configuration or a fake before `setup()` instead of threading arguments
 * through a factory.
 */
export const ConsoleInjectionKey = {
    Config: new TypedToken<ConsoleConfig>('ConsoleConfig'),
    App: new TypedToken<IApp>('ConsoleApp'),
    Server: new TypedToken<ConsoleServer>('ConsoleServer'),
};
