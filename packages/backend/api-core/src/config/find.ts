/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    loadScriptFileExport, loadScriptFileExportSync, locateFile, locateFileSync,
} from 'locter';
import { buildConfig } from './build';

export async function findConfig(directoryPath?: string) {
    directoryPath ??= process.cwd();

    const fileInfo = await locateFile('authelion.config', {
        extensions: ['.ts', '.js', '.json'],
        paths: directoryPath,
    });

    if (!fileInfo) {
        return buildConfig({}, directoryPath);
    }

    const fileExport = await loadScriptFileExport(fileInfo);
    if (fileExport.key !== 'default') {
        return buildConfig({}, directoryPath);
    }

    return buildConfig(fileExport.value, directoryPath);
}

export function findConfigSync(directoryPath?: string) {
    directoryPath ??= process.cwd();

    const fileInfo = locateFileSync('authelion.config', {
        extensions: ['.ts', '.js', '.json'],
        paths: directoryPath,
    });

    if (!fileInfo) {
        return buildConfig({}, directoryPath);
    }

    const fileExport = loadScriptFileExportSync(fileInfo);
    if (fileExport.key !== 'default') {
        return buildConfig({}, directoryPath);
    }

    return buildConfig(fileExport.value, directoryPath);
}
