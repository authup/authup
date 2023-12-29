/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/core';
import { getModuleExport, load } from 'locter';
import path from 'node:path';
import { assign } from 'smob';
import { buildLookupDirectories } from './build';
import { findFilePaths } from './find';
import type { ConfigRaw, ReadContext } from './types';

export async function readFromPath(filePath: string) : Promise<ConfigRaw> {
    const content : ConfigRaw = {
        client: {},
        server: {},
    };

    const file = await load(filePath);
    const fileName = path.basename(filePath);
    const fileExport = getModuleExport(file);

    if (!isObject(fileExport.value)) {
        return content;
    }

    const parts = fileName.split('.');
    parts.shift(); // strip authup prefix
    parts.pop(); // strip file extension

    if (parts.length === 0) {
        const keys = ['client', 'server'] as ('client' | 'server')[];
        for (let j = 0; j < keys.length; j++) {
            if (
                hasOwnProperty(fileExport.value, keys[j]) &&
                isObject(fileExport.value[keys[j]])
            ) {
                content[keys[j]] = fileExport.value[keys[j]] as Record<string, any>;
            }
        }

        return content;
    }

    if (parts.length === 1) {
        const [type] = parts;
        if (type !== 'client' && type !== 'server') {
            return content;
        }

        if (isObject(fileExport.value)) {
            content[type] = fileExport.value;
        }

        return content;
    }

    if (parts.length === 2) {
        const [type, name] = parts;
        if (type !== 'client' && type !== 'server') {
            return content;
        }

        content[type][name] = fileExport.value;
    }

    return content;
}

export async function readFromFilePaths(filePaths: string[]) : Promise<ConfigRaw> {
    const content : ConfigRaw = {
        client: {},
        server: {},
    };

    for (let i = 0; i < filePaths.length; i++) {
        const config = await readFromPath(filePaths[i]);
        assign(content, config);
    }

    return content;
}
/**
 * Read config file(s) as global config object.
 *
 * @param context
 */
export async function read(context: ReadContext = {}) : Promise<ConfigRaw> {
    const directories = buildLookupDirectories();
    const filePaths = await findFilePaths([
        ...directories,
        ...(context.directory ? [context.directory] : []),
    ]);

    return readFromFilePaths(filePaths);
}

export function extractFor(
    config: ConfigRaw,
    type: 'client' | 'server',
    name: string,
) : Record<string, any> | undefined {
    return config[type][name];
}

export async function readFor(
    type: 'client' | 'server',
    name: string,
    context: ReadContext = {},
): Promise<Record<string, any> | undefined> {
    const config = await read(context);

    return extractFor(config, type, name);
}
