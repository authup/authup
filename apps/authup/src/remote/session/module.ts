/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from './file.ts';
import { createKeychainStore } from './keyring.ts';
import type { CLISession, SessionStore } from './types.ts';

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

export async function readSession(store: SessionStore, server: string) : Promise<CLISession> {
    const raw = await store.read();
    if (raw === undefined) {
        throw new Error('No saved login for this server and credential store. Run authup login --client-id <id> first.');
    }
    let session;
    try {
        session = JSON.parse(raw);
    } catch {
        // JSON parser errors can include the source, which contains tokens.
        throw new Error('Invalid saved credentials. Run authup login again.');
    }
    if (!session || session.server !== server || typeof session.clientId !== 'string' || !session.clientId ||
        typeof session.accessToken !== 'string' || !session.accessToken || !Number.isFinite(session.expiresAt) ||
        (session.refreshToken !== undefined && typeof session.refreshToken !== 'string')) {
        throw new Error('Invalid saved credentials. Run authup login again.');
    }
    return session;
}

export async function saveSession(store: SessionStore, session: CLISession) : Promise<void> {
    await store.write(JSON.stringify(session));
}

export async function withSession<T>(
    server: string,
    selection: string | undefined,
    run: (store: SessionStore, signal: AbortSignal) => Promise<T>,
) : Promise<T> {
    const selected = selection || process.env.AUTHUP_CREDENTIAL_STORE || 'keychain';
    if (selected !== 'keychain' && selected !== 'file') {
        throw new Error('--credential-store must be keychain or file.');
    }
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
        const store = selected === 'file' ? createFileStore(file) : await createKeychainStore(server, controller.signal);
        return await run(store, controller.signal);
    } finally {
        process.removeListener('SIGINT', interrupt);
        process.removeListener('SIGTERM', interrupt);
        await handle.close();
        await fs.rm(lock, { force: true });
    }
}
