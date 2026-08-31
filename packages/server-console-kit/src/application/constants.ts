/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IApp } from 'routup';
import type { IThemeProvider } from '../theme/index';
import type { Config, HTTPServer } from './types';

export enum ModuleName {
    CONFIG = 'config',
    THEME = 'theme',
    HTTP = 'http',
}

/**
 * A pre-registered token WINS over the module that would otherwise register
 * it, the same seam server-core carries: a console's tests inject a
 * configuration or a fake before `setup()` instead of threading arguments
 * through a factory.
 */
export const InjectionKey = {
    Config: new TypedToken<Config>('Config'),
    App: new TypedToken<IApp>('ConsoleApp'),
    Server: new TypedToken<HTTPServer>('HTTPServer'),
    Theme: new TypedToken<IThemeProvider | undefined>('ConsoleTheme'),
};
