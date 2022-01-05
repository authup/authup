/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum VaultKVVersion {
    ONE = 1,
    TWO = 2,
}

export type VaultKVOptions = {
    version?: VaultKVVersion
};

export type VaultEnginePayload = {
    path: string,
    type: 'kv',
    description?: string,
    config: Record<string, any>,
    generate_signing_key?: boolean,
    options: VaultKVOptions,
};
