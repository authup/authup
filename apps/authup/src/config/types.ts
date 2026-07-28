/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ServerCoreSectionConfig = {
    port?: number,
    host?: string,
    publicUrl?: string,
};

export type ClientWebSectionConfig = {
    port?: number,
    host?: string,
    apiUrl?: string,
    cookieDomain?: string,
};

export type LauncherConfig = {
    serverCore: ServerCoreSectionConfig,
    clientWeb: ClientWebSectionConfig,
};

export type LauncherConfigReadOptions = {
    directory?: string,
    file?: string | string[],
};
