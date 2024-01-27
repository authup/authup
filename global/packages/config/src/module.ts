/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    getEnv,
    getEnvArray,
    isObject,
} from '@authup/core';
import {
    buildFilePath,
    load,
    locateMany,
} from 'locter';
import path from 'node:path';
import { normalize } from 'pathe';
import { assign } from 'smob';
import { EnvKey } from './constants';
import { deserializeKey } from './key';
import type {
    ContainerBundleItem, ContainerContext, ContainerItem, Key,
} from './types';

export class Container {
    public readonly items : ContainerItem[];

    protected readonly prefix : string;

    protected readonly keys : Key[];

    protected readonly groups: string[];

    constructor(ctx: ContainerContext) {
        this.prefix = ctx.prefix;
        this.items = [];
        this.keys = this.buildKeys(ctx.keys);
        this.groups = this.buildGroups(this.keys);
    }

    getData(id: string) : Record<string, unknown> | undefined {
        const item = this.get(id);
        if (item) {
            return item.data;
        }

        return undefined;
    }

    get(id: string) : ContainerBundleItem | undefined {
        const app = deserializeKey(id);
        if (!app) {
            return undefined;
        }

        const items = this.items.filter((item) => {
            if (
                item.name === app.name &&
                item.group === app.group
            ) {
                return true;
            }

            return item.name === 'default' && !item.group;
        });

        if (items.length === 0) {
            return undefined;
        }

        const output : ContainerBundleItem = {
            paths: [],
            group: app.group,
            name: app.name,
            data: {},
        };

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            assign(output.data, item.data);

            if (item.path) {
                output.paths.push(item.path);
            }
        }

        return output;
    }

    async load() : Promise<void> {
        const directories : string[] = [
            '.',
        ];

        const writableDirectoryPath = getEnv(EnvKey.WRITABLE_DIRECTORY_PATH);
        if (writableDirectoryPath) {
            directories.push(normalize(writableDirectoryPath));
        } else {
            directories.push('writable');
        }

        const envDirectories = getEnvArray(EnvKey.CONFIG_DIRECTORY);
        if (envDirectories) {
            for (let i = 0; i < envDirectories.length; i++) {
                directories.push(normalize(envDirectories[i]));
            }
        }

        const filePaths = await this.findFilePaths(directories);

        const envFilePaths = getEnvArray(EnvKey.CONFIG_FILE);
        if (envFilePaths) {
            for (let i = 0; i < envFilePaths.length; i++) {
                filePaths.push(normalize(envFilePaths[i]));
            }
        }

        await this.loadFromFilePath(filePaths);
    }

    async loadFromPath(input: string | string[]) : Promise<void> {
        const filePaths = await this.findFilePaths(input);

        await this.loadFromFilePath(filePaths);
    }

    async loadFromFilePath(input: string | string[]) : Promise<void> {
        if (Array.isArray(input)) {
            for (let i = 0; i < input.length; i++) {
                await this.loadFromFilePath(input[i]);
            }

            return;
        }

        const file = await load(input);
        const fileName = path.basename(input);
        const data = file.default ? file.default : file;

        if (!isObject(data)) {
            return;
        }

        const parts = fileName.split('.');
        parts.shift(); // strip authup prefix
        parts.pop(); // strip file extension

        if (parts.length === 0) {
            let found : boolean = false;
            for (let j = 0; j < this.groups.length; j++) {
                const group = data[this.groups[j]];
                if (isObject(group)) {
                    this.items.push(...this.extractGroupApps(group, {
                        path: input,
                        group: this.groups[j],
                    }));

                    found = true;
                }
            }

            if (
                !found &&
                isObject(data)
            ) {
                this.items.push({
                    name: 'default',
                    data,
                    path: input,
                });
            }

            return;
        }

        if (parts.length === 1) {
            const [group] = parts;

            if (isObject(data)) {
                this.items.push(...this.extractGroupApps(data, {
                    path: input,
                    group,
                }));
            }

            return;
        }

        if (parts.length === 2) {
            const [group, name] = parts;
            if (
                this.groups.length > 0 &&
                this.groups.indexOf(group) === -1
            ) {
                return;
            }

            if (isObject(data)) {
                this.items.push({
                    name,
                    group,
                    data,
                    path: input,
                });
            }
        }
    }

    protected async findFilePaths(path?: string[] | string) : Promise<string[]> {
        const locations = await locateMany([
            `${this.prefix}.*.*.{conf,js,mjs,cjs,ts,mts,mts}`,
            `${this.prefix}.*.{conf,js,mjs,cjs,ts,mts,mts}`,
            `${this.prefix}.{conf,js,mjs,cjs,ts,mts,mts}`,
        ], {
            path,
        });

        return locations.map(
            (location) => buildFilePath(location),
        );
    }

    protected extractGroupApps(
        group: Record<string, any>,
        context: Pick<ContainerItem, 'group' | 'path'>,
    ) : ContainerItem[] {
        const items : ContainerItem[] = [];

        const appKeys = Object.keys(group);
        for (let k = 0; k < appKeys.length; k++) {
            if (isObject(group[appKeys[k]])) {
                items.push({
                    name: appKeys[k],
                    data: group[appKeys[k]],
                    ...context,
                });
            }
        }

        return items;
    }

    private buildKeys(input: string[] | Key[]) : Key[] {
        const keys : Key[] = [];

        let key : Key | undefined;
        for (let i = 0; i < input.length; i++) {
            key = this.buildKey(input[i]);
            if (key) {
                keys.push(key);
            }
        }

        return keys;
    }

    private buildKey(input: string | Key) : Key {
        return typeof input === 'string' ?
            deserializeKey(input) :
            input;
    }

    private buildGroups(keys: Key[]) : string[] {
        return keys
            .map((key) => key.group)
            .filter(Boolean) as string[];
    }
}
