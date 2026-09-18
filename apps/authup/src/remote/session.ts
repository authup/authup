/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type CLISession = {
    server: string,
    clientId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt: number,
};

export function normalizeServer(input: string) : string {
    const url = new URL(input);
    if (url.username || url.password || url.search || url.hash) {
        throw new Error('The server URL must not contain credentials, a query or a fragment.');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
        throw new Error('Use HTTPS for remote servers (HTTP is allowed for loopback only).');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    return url.href;
}

export function resolveAPIPath(server: string, input: string) : string {
    if (!input || /^[a-z][a-z\d+.-]*:/i.test(input) || input.startsWith('//') || /[\\#\s]/.test(input)) {
        throw new Error('Use an API path relative to the configured server.');
    }
    const url = new URL(input.replace(/^\//, ''), server);
    if (url.origin !== new URL(server).origin || !url.pathname.startsWith(new URL(server).pathname)) {
        throw new Error('The API path must stay within the configured server base path.');
    }
    return url.href;
}

export function sessionFromGrant(server: string, clientId: string, grant: OAuth2TokenGrantResponse, refreshToken?: string) : CLISession {
    if (!grant.access_token || typeof grant.access_token !== 'string' ||
        grant.token_type?.toLowerCase() !== 'bearer' ||
        !Number.isFinite(grant.expires_in) || grant.expires_in < 0 ||
        (grant.refresh_token !== undefined && typeof grant.refresh_token !== 'string')) {
        throw new Error('The server returned an invalid token grant.');
    }
    return {
        server,
        clientId,
        accessToken: grant.access_token,
        refreshToken: grant.refresh_token ?? refreshToken,
        expiresAt: Date.now() + grant.expires_in * 1000,
    };
}

export async function readSession(file: string, server: string) : Promise<CLISession> {
    let handle;
    try {
        handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error('No saved login for this server. Run authup login --client-id <id> first.', { cause: error });
        }
        throw error;
    }
    try {
        const stat = await handle.stat();
        if (!stat.isFile() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) {
            throw new Error('Credentials must be a private file (mode 0600).');
        }
        let session;
        try {
            session = JSON.parse(await handle.readFile('utf8'));
        } catch {
            // JSON parser errors can include the source, which contains tokens.
            throw new Error('Invalid credentials file. Run authup login again.');
        }
        if (!session || session.server !== server || typeof session.clientId !== 'string' || !session.clientId ||
            typeof session.accessToken !== 'string' || !session.accessToken || !Number.isFinite(session.expiresAt) ||
            (session.refreshToken !== undefined && typeof session.refreshToken !== 'string')) {
            throw new Error('Invalid credentials file. Run authup login again.');
        }
        return session;
    } finally {
        await handle.close();
    }
}

export async function saveSession(file: string, session: CLISession) : Promise<void> {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporary, JSON.stringify(session), { mode: 0o600, flag: 'wx' });
        await fs.rename(temporary, file);
    } finally {
        await fs.rm(temporary, { force: true });
    }
}

export async function withSessionFile<T>(server: string, run: (file: string, signal: AbortSignal) => Promise<T>) : Promise<T> {
    const directory = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'authup', 'credentials');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error('The credentials directory must be a real directory.');
    }
    await fs.chmod(directory, 0o700);
    const file = path.join(directory, `${createHash('sha256').update(server).digest('hex')}.json`);
    // ponytail: one command per server; a killed process needs its stale lock removed manually.
    const lock = `${file}.lock`;
    let handle;
    try {
        handle = await fs.open(lock, 'wx', 0o600);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new Error(`Another CLI command is using this server. If it exited unexpectedly, remove ${lock} and retry.`, { cause: error });
        }
        throw error;
    }
    const controller = new AbortController();
    const interrupt = () => controller.abort(new Error('Command interrupted.'));
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    try {
        return await run(file, controller.signal);
    } finally {
        process.removeListener('SIGINT', interrupt);
        process.removeListener('SIGTERM', interrupt);
        await handle.close();
        await fs.rm(lock, { force: true });
    }
}
