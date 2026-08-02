/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PackageName {
    CLIENT_ADMIN_CONSOLE = '@authup/client-admin-console',
    SERVER_CORE = '@authup/server-core',
}

export enum PackageID {
    CLIENT_ADMIN_CONSOLE = 'client.admin-console',
    SERVER_CORE = 'server.core',
}

export enum LauncherCommand {
    START = 'start',
    MIGRATION = 'migration',
    HEALTHCHECK = 'healthcheck',
}

export const PACKAGE_NAME_MAP : Record<`${PackageID}`, `${PackageName}`> = {
    [PackageID.CLIENT_ADMIN_CONSOLE]: PackageName.CLIENT_ADMIN_CONSOLE,
    [PackageID.SERVER_CORE]: PackageName.SERVER_CORE,
};

export const PACKAGE_BIN_NAME_MAP : Record<`${PackageID}`, string> = {
    [PackageID.CLIENT_ADMIN_CONSOLE]: 'authup-admin-console',
    [PackageID.SERVER_CORE]: 'authup-server',
};
