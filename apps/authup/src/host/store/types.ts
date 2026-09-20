/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type HostStorage = 'keychain' | 'file';

export type HostTokens = {
    accessToken: string,
    refreshToken?: string,
    expiresAt: number,
};

export type HostEntry = {
    clientId: string,
    realm?: string,
    storage: HostStorage,
} & Partial<HostTokens>;

export type HostsDocument = {
    current?: string,
    hosts: Record<string, HostEntry>,
};

export interface IHostStore {
    readonly directory: string;

    read() : Promise<HostsDocument>;

    write(document: HostsDocument) : Promise<void>;
}

export interface IHostTokenStorage {
    read(host: string) : Promise<HostTokens | undefined>;

    write(host: string, tokens: HostTokens) : Promise<void>;

    remove(host: string) : Promise<void>;
}
