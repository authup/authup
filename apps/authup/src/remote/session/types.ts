/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CLISession = {
    server: string,
    clientId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt: number,
};

export type SessionStore = {
    read: () => Promise<string | undefined>,
    write: (value: string) => Promise<void>,
    remove: () => Promise<void>,
};
