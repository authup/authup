/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CLIConfigArgs = {
    configDirectory?: string,
    configFile?: string,
};

export type CLIMigrationCommandOptions = {
    generate?: boolean,
};

export type ShutdownHandlersOptions = {
    /**
     * Runs once, as the first signal arrives and before anything is torn down.
     */
    onSignal?: () => void,
    /**
     * Milliseconds to keep serving between the signal and the teardown.
     * default: 0
     */
    delay?: number,
};
