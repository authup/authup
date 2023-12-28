/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import type { ConfigInput } from '@authup/server-core-app';
import { createConfig as createApiConfig, parseConfig } from '@authup/server-core-app';
import { readConfigFile } from '@authup/server-core';
import type { UIOptionsInput } from '../packages';
import {
    createUIConfig,
    extendServerConfigWithEnv,
    extendUIConfigWithEnv,
    parseUIConfig,
} from '../packages';
import type { Config } from './type';

export async function createConfig() : Promise<Config> {
    const global = await readConfigFile();

    const apiInput : ConfigInput = {};
    if (global.api) {
        const uiParsed = parseConfig(global.api);
        const keys = Object.keys(uiParsed);
        for (let i = 0; i < keys.length; i++) {
            apiInput[keys[i]] = uiParsed[keys[i]];
        }
    }

    const api = createApiConfig(apiInput);
    extendServerConfigWithEnv(api);

    const uiInput: UIOptionsInput = {};

    if (global.ui) {
        const uiParsed = parseUIConfig(global.ui);
        const keys = Object.keys(uiParsed);
        for (let i = 0; i < keys.length; i++) {
            uiInput[keys[i]] = uiParsed[keys[i]];
        }
    }

    const ui = createUIConfig(uiInput);
    extendUIConfigWithEnv(ui);

    ui.$gettersHas = false;
    ui.$defaultsHas = false;

    if (
        !Object.prototype.hasOwnProperty.call(ui, 'apiUrl') &&
        api.publicUrl
    ) {
        ui.apiUrl = makeURLPublicAccessible(api.publicUrl);
    }

    if (
        !Object.prototype.hasOwnProperty.call(ui, 'publicUrl') &&
        api.authorizeRedirectUrl
    ) {
        ui.publicUrl = api.authorizeRedirectUrl;
    }

    ui.$gettersHas = true;
    ui.$defaultsHas = true;

    return {
        api,
        ui,
    };
}
