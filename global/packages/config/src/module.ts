/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/core';
import { getModuleExport, load } from 'locter';
import path from 'node:path';
import { assign } from 'smob';
import { buildLookupDirectories } from './build';
import { GroupKey } from './constants';
import { findFilePaths } from './find';
import type { ContainerGetContext, ContainerItem } from './types';

export class Container {
    public readonly items : ContainerItem[];

    constructor() {
        this.items = [];
    }

    get(context: ContainerGetContext) : Record<string, unknown> | undefined {
        const items = this.items.filter((item) => {
            if (
                item.id === context.id &&
                item.group === context.group
            ) {
                return true;
            }

            return item.id === 'default' &&
                item.group === GroupKey.UNKNOWN;
        });

        if (items.length === 0) {
            return undefined;
        }

        const output : Record<string, unknown> = {};
        for (let i = 0; i < items.length; i++) {
            assign(output, items[i].data);
        }

        return output;
    }

    async load(input?: string | string[]) : Promise<void> {
        const directories = buildLookupDirectories();
        if (input) {
            if (Array.isArray(input)) {
                directories.push(...input);
            } else {
                directories.push(input);
            }
        }

        await this.loadFromPath(directories);
    }

    async loadFromPath(input: string | string[]) : Promise<void> {
        const filePaths = await findFilePaths(input);

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
        const fileExport = getModuleExport(file);

        if (!isObject(fileExport.value)) {
            return;
        }

        const parts = fileName.split('.');
        parts.shift(); // strip authup prefix
        parts.pop(); // strip file extension

        if (parts.length === 0) {
            let found : boolean = false;
            const groupKeys = Object.values(GroupKey);
            for (let j = 0; j < groupKeys.length; j++) {
                const group = fileExport.value[groupKeys[j]];
                if (isObject(group)) {
                    this.items.push(...this.extractGroupApps(group, {
                        path: input,
                        group: groupKeys[j],
                    }));

                    found = true;
                }
            }

            if (
                !found &&
                isObject(fileExport.value)
            ) {
                this.items.push({
                    group: GroupKey.UNKNOWN,
                    id: 'default',
                    data: fileExport.value,
                    path: input,
                });
            }

            return;
        }

        if (parts.length === 1) {
            const [group] = parts;
            if (group !== GroupKey.CLIENT && group !== GroupKey.SERVER) {
                return;
            }

            if (isObject(fileExport.value)) {
                this.items.push(...this.extractGroupApps(fileExport.value, {
                    path: input,
                    group,
                }));
            }

            return;
        }

        if (parts.length === 2) {
            const [group, id] = parts;
            if (group !== GroupKey.CLIENT && group !== GroupKey.SERVER) {
                return;
            }

            if (isObject(fileExport.value)) {
                this.items.push({
                    id,
                    group,
                    data: fileExport.value,
                    path: input,
                });
            }
        }
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
                    id: appKeys[k],
                    data: group[appKeys[k]],
                    ...context,
                });
            }
        }

        return items;
    }
}
