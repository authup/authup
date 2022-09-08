/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    loadScriptFileExport,
    loadScriptFileExportSync,
    locateFiles,
    locateFilesSync,
} from 'locter';
import defu from 'defu';
import { extendConfig } from './extend';
import { Config } from '../type';
import { readEnvConfig } from '../env';
import { validateConfig } from './validate';
import { useLogger } from '../../logger';

export async function loadConfig(directoryPath?: string) : Promise<Config> {
    directoryPath ??= process.cwd();

    const items : Partial<Config>[] = [];
    items.push(readEnvConfig());

    const fileInfos = await locateFiles('authelion.{ts,js,json}', {
        path: directoryPath,
    });

    for (let i = 0; i < fileInfos.length; i++) {
        const fileExport = await loadScriptFileExport(fileInfos[i]);
        if (fileExport.key === 'default') {
            try {
                validateConfig(fileExport.value);
                items.push(fileExport.value);
            } catch (e) {
                useLogger().error(`The configuration file ${fileInfos[i].name} (path: ${fileInfos[i].path}) is not valid.`);
            }
        }
    }

    return extendConfig(defu({}, ...items), directoryPath);
}

export function findConfigSync(directoryPath?: string) {
    directoryPath ??= process.cwd();

    const items : Partial<Config>[] = [];
    items.push(readEnvConfig());

    const fileInfos = locateFilesSync('authelion.{ts,js,json}', {
        path: directoryPath,
    });

    for (let i = 0; i < fileInfos.length; i++) {
        const fileExport = loadScriptFileExportSync(fileInfos[i]);
        if (fileExport.key === 'default') {
            try {
                validateConfig(fileExport.value);
                items.push(fileExport.value);
            } catch (e) {
                useLogger().error(`The configuration file ${fileInfos[i].name} (path: ${fileInfos[i].path}) is not valid.`);
            }
        }
    }

    return extendConfig(defu({}, ...items), directoryPath);
}
