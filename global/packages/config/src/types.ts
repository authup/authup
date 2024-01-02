/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Key = {
    name: string,
    group?: string
};

export type ContainerItemData = Record<string, unknown>;

export type ContainerItem = {
    path?: string,
    data: ContainerItemData,
    name: string,
    group?: string
};

export type ContainerBundleItem = {
    paths: string[],
    data: ContainerItemData,
    name: string,
    group?: string
};

export type ContainerContext = {
    keys: string[] | Key[],
    prefix: string
};
