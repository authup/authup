/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GroupKey } from './constants';

export type ReadContext = {
    directory?: string
};

export type ConfigRaw = {
    client: Record<string, Record<string, any>>
    server: Record<string, Record<string, any>>,
};

export type ContainerItem = {
    path?: string,
    data: Record<string, unknown>,
    group: `${GroupKey}`,
    id: string
};

export type ContainerGetContext = {
    id: string,
    group: string
};
