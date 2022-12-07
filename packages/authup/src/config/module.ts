/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readConfig as readServerConfig, setOptions } from '@authup/server';
import { merge } from 'smob';
import { extendUiConfig, readUIConfig, validateUiConfig } from '../packages';
import { readConfig } from './read';
import { Options } from './type';

let instance : Options | undefined;

export function useConfig() : Options {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = createConfig();

    return instance;
}

export function createConfig() : Options {
    const global = readConfig();

    global.ui = merge({}, readUIConfig(), global.ui);
    global.server = merge({}, readServerConfig(), global.server);

    const ui = validateUiConfig(global.ui);
    const server = setOptions(global.server);

    const url = new URL(server.http.uiUrl);
    if (typeof ui.port === 'undefined') {
        if (url.port.length > 0) {
            ui.port = parseInt(url.port, 10);
        }
    }
    if (typeof ui.host === 'undefined') {
        ui.host = url.hostname;
    }

    return {
        server,
        ui: extendUiConfig(ui),
    };
}
