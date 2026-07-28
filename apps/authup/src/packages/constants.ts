/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PackageName {
    CLIENT_WEB = '@authup/client-web',
    SERVER_CORE = '@authup/server-core',
}

export enum PackageID {
    CLIENT_WEB = 'client.web',
    SERVER_CORE = 'server.core',
}

export enum LauncherCommand {
    START = 'start',
    MIGRATION = 'migration',
    HEALTHCHECK = 'healthcheck',
}

export const PACKAGE_NAME_MAP : Record<`${PackageID}`, `${PackageName}`> = {
    [PackageID.CLIENT_WEB]: PackageName.CLIENT_WEB,
    [PackageID.SERVER_CORE]: PackageName.SERVER_CORE,
};

export const PACKAGE_BIN_NAME_MAP : Record<`${PackageID}`, string> = {
    [PackageID.CLIENT_WEB]: 'authup-ui',
    [PackageID.SERVER_CORE]: 'authup-server',
};
