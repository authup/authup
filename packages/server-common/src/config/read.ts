/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/common';
import { getModuleExport, load, locateMany } from 'locter';
import path from 'node:path';
import process from 'node:process';
import { merge } from 'smob';
import type { ConfigFileReadContext } from './type';
import { buildWorkingDirectoryPathsForConfigFile } from './utils';

export async function readConfigFile(context?: ConfigFileReadContext) : Promise<Record<string, any>> {
    context = context || {};

    const cwd : string[] = [];
    if (context.cwd) {
        const arr = Array.isArray(context.cwd) ?
            context.cwd :
            [context.cwd];

        for (let i = 0; i < arr.length; i++) {
            if (path.isAbsolute(arr[i])) {
                cwd.push(arr[i]);
            } else {
                cwd.push(path.join(process.cwd(), arr[i]));
            }
        }
    }

    if (cwd.length === 0) {
        cwd.push(...buildWorkingDirectoryPathsForConfigFile());
    }

    const locations = await locateMany([
        'authup.*.{conf,js,mjs,cjs,ts,mts,mts}',
        'authup.{conf,js,mjs,cjs,ts,mts,mts}',
    ], {
        path: cwd,
    });

    const content : Record<string, any> = {};

    for (let i = 0; i < locations.length; i++) {
        const file = await load(locations[i]);
        const fileExport = getModuleExport(file);

        if (!isObject(fileExport.value)) {
            continue;
        }

        const [root, name] = locations[i].name.split('.');
        if (root && name) {
            if (context.name === name) {
                merge(content, fileExport.value);
            } else if (!context.name) {
                content[name] = content[name] || {};
                merge(content[name], fileExport.value);
            }
        }

        if (root && !name) {
            if (context.name) {
                if (isObject(fileExport.value[context.name])) {
                    merge(content, fileExport.value[context.name]);
                }
            } else {
                merge(content, fileExport.value);
            }
        }
    }

    return content;
}
