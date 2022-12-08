/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/common';
import { setOptions } from '@authup/server';
import consola from 'consola';
import { extendUiConfig, validateUiConfig } from '../packages';
import { readConfig } from './read';
import { Options } from './type';

export async function createConfig() : Promise<Options> {
    const global = await readConfig();

    const server = setOptions(global.server || {});
    const ui = validateUiConfig(global.ui || {});

    if (
        typeof ui.apiUrl === 'undefined' &&
        server.http.publicUrl
    ) {
        ui.apiUrl = makeURLPublicAccessible(server.http.publicUrl);
    }

    return {
        server,
        ui: extendUiConfig(ui),
    };
}
