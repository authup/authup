/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PackageName {
    SERVER_CORE = '@authup/server-core',
}

/**
 * The selectors the CLI accepts. `client.admin-console` is still parsed so an
 * existing invocation or config file keeps working, but it launches nothing:
 * the admin console is served by server-core since plan 081 and the launcher
 * answers the selector with a warning.
 */
export enum PackageID {
    CLIENT_ADMIN_CONSOLE = 'client.admin-console',
    SERVER_CORE = 'server.core',
}

export type LaunchablePackageID = PackageID.SERVER_CORE;

export enum LauncherCommand {
    START = 'start',
    MIGRATION = 'migration',
    HEALTHCHECK = 'healthcheck',
}

export const PACKAGE_NAME_MAP : Record<LaunchablePackageID, `${PackageName}`> = { [PackageID.SERVER_CORE]: PackageName.SERVER_CORE };

export const PACKAGE_BIN_NAME_MAP : Record<LaunchablePackageID, string> = { [PackageID.SERVER_CORE]: 'authup-server' };

export const ADMIN_CONSOLE_SELECTOR_WARNING = `The "${PackageID.CLIENT_ADMIN_CONSOLE}" package is served by server-core at <publicUrl>/admin and no longer runs as a separate process; the selector is ignored.`;

export const ADMIN_CONSOLE_SECTION_WARNING = `The "${PackageID.CLIENT_ADMIN_CONSOLE}" config section has no effect: the admin console is served by server-core at <publicUrl>/admin. Remove the section.`;
