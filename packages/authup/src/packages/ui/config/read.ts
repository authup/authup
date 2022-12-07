/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { loadScriptFileExportSync, locateFilesSync } from 'locter';
import { merge } from 'smob';
import { UIOptionsInput } from '../type';

export function readUIConfig(directoryPath?: string) {
    const items : UIOptionsInput[] = [];

    const fileInfos = locateFilesSync('authup.ui.{ts,js,json}', {
        path: directoryPath,
    });

    for (let i = 0; i < fileInfos.length; i++) {
        const fileExport = loadScriptFileExportSync(fileInfos[i]);
        if (fileExport.key === 'default') {
            items.push(fileExport.value);
        }
    }

    return merge({}, ...items);
}
