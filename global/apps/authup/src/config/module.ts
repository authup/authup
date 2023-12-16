/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import { createConfig as createApiConfig } from '@authup/server-core-app';
import { readConfigFile } from '@authup/server-core';
import { createUIConfig, extendServerConfigWithEnv, extendUIConfigWithEnv } from '../packages';
import type { Config } from './type';

export async function createConfig() : Promise<Config> {
    const global = await readConfigFile();

    const api = createApiConfig();
    const ui = createUIConfig();

    api.setRaw(global.api || {});
    ui.setRaw(global.ui || {});

    if (!ui.has('apiUrl') && api.has('publicUrl')) {
        ui.setRaw('apiUrl', makeURLPublicAccessible(api.get('publicUrl')));
    }

    if (!ui.has('publicUrl') && api.has('authorizeRedirectUrl')) {
        ui.set('publicUrl', api.get('authorizeRedirectUrl'));
    }

    extendServerConfigWithEnv(api);
    extendUIConfigWithEnv(ui);

    return {
        api,
        ui,
    };
}
