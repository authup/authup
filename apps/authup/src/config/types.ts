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

export type LauncherConfig = {
    serverCore: ServerCoreSectionConfig,
    /**
     * Deprecation notices for sections that are read but have no effect
     * (`client.admin-console`, see plan 081).
     */
    warnings: string[],
};

export type LauncherConfigReadOptions = {
    directory?: string,
    /**
     * Single file only — the value is forwarded verbatim to the server child
     * as `--configFile`, and citty resolves a repeated flag to its last value
     * on both sides, so a list could never survive the hand-off.
     */
    file?: string,
};
