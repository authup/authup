/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* eslint-disable no-console */

import { ErrorCode } from '@authup/errors';
import { OAuth2DeviceAuthorizationError, OAuth2GrantError } from '@authup/specs';
import { runCommand } from 'citty';
import { FetchTransport, MemoryTransport } from 'hapic';
import type { TransportRequest } from 'hapic';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import type * as Timers from 'node:timers/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineCLIAPICommand, defineCLILoginCommand, defineCLILogoutCommand } from '../../src/commands/remote.ts';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

const server = 'https://auth.example.test/auth/';
const device = {
    device_code: 'secret-device',
    user_code: 'BCDF-GHJK',
    verification_uri: `${server}device`,
    verification_uri_complete: `${server}device?user_code=BCDF-GHJK`,
    interval: 5,
    expires_in: 600,
};
const grant = {
    access_token: 'secret-access',
    refresh_token: 'secret-refresh',
    expires_in: 60,
    token_type: 'Bearer',
};

function form(request: TransportRequest) {
    return Object.fromEntries(new URLSearchParams(String(request.body)));
}

describe('remote CLI commands', () => {
    let directory: string;
    let now: number;
    let transport: MemoryTransport;
    let replies: Array<{ status?: number, body?: unknown }>;

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'authup-cli-remote-'));
        vi.stubEnv('XDG_CONFIG_HOME', directory);
        vi.stubEnv('AUTHUP_SERVER_URL', server);
        now = 100000;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        vi.mocked(setTimeout).mockImplementation(async (delay) => { now += Number(delay); });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        replies = [{ body: device }, { body: grant }];
        transport = new MemoryTransport({ fetch: () => replies.shift() ?? { body: { ok: true } } });
        vi.spyOn(FetchTransport.prototype, 'dispatch').mockImplementation((request) => transport.dispatch(request));
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        await fs.rm(directory, { recursive: true, force: true });
    });

    async function login() {
        await runCommand(defineCLILoginCommand(), { rawArgs: ['--client-id', 'client-id'] });
    }

    async function api(rawArgs = ['users']) {
        return runCommand(defineCLIAPICommand(), { rawArgs });
    }

    async function credentialFile() {
        const root = path.join(directory, 'authup', 'credentials');
        const names = await fs.readdir(root);
        return path.join(root, names.find((name) => name.endsWith('.json'))!);
    }

    it('polls at the advertised interval, slows down cumulatively, saves privately and reuses the grant', async () => {
        replies = [
            { body: device },
            { status: 400, body: JSON.parse(JSON.stringify(OAuth2DeviceAuthorizationError.pending())) },
            { status: 400, body: JSON.parse(JSON.stringify(OAuth2DeviceAuthorizationError.slowDown())) },
            { status: 400, body: JSON.parse(JSON.stringify(OAuth2DeviceAuthorizationError.pending())) },
            { body: grant },
        ];
        await login();
        expect(vi.mocked(setTimeout).mock.calls.map(([delay]) => delay)).toEqual([5000, 5000, 10000, 10000]);
        expect(form(transport.requests[0])).toEqual({ client_id: 'client-id' });
        expect(form(transport.requests[1])).toEqual({
            client_id: 'client-id',
            device_code: device.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        });
        const file = await credentialFile();
        expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
        expect((await fs.stat(path.dirname(file))).mode & 0o777).toBe(0o700);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(device.verification_uri_complete));
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(device.user_code));
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret-');
        await api(['users?filter[name]=alice']);
        expect(transport.requests.at(-1)?.url).toBe(`${server}users?filter[name]=alice`);
        expect(new Headers(transport.requests.at(-1)?.headers).get('authorization')).toBe('Bearer secret-access');
        expect(console.log).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));
    });

    it.each([
        OAuth2DeviceAuthorizationError.expired(),
        OAuth2GrantError.invalid(),
        {
            code: ErrorCode.OAUTH_ACCESS_DENIED,
            message: 'Denied',
            data: { error: 'access_denied' },
        },
    ])('stops on a terminal grant error without saving credentials', async (error) => {
        replies = [{ body: device }, { status: 400, body: JSON.parse(JSON.stringify(error)) }];
        await expect(login()).rejects.toThrow();
        expect(transport.requests).toHaveLength(2);
        expect(await fs.readdir(path.join(directory, 'authup', 'credentials'))).toEqual([]);
    });

    it('stops locally when the device code expires', async () => {
        replies = [{ body: { ...device, expires_in: 4 } }];
        await expect(login()).rejects.toThrow(/expired/i);
        expect(transport.requests).toHaveLength(1);
    });

    it('refreshes and saves rotation before sending a JSON mutation', async () => {
        await login();
        now += 61000;
        replies = [{
            body: {
                ...grant,
                access_token: 'rotated-access',
                refresh_token: 'rotated-refresh',
            },
        }, { body: { id: 'new-user' } }];
        await api(['users', '--method', 'POST', '--data', '{"name":"alice"}']);
        expect(form(transport.requests[2])).toEqual({
            grant_type: 'refresh_token',
            client_id: 'client-id',
            refresh_token: 'secret-refresh',
        });
        expect(new Headers(transport.requests[2].headers).has('authorization')).toBe(false);
        expect(transport.requests[3].method).toBe('POST');
        expect(transport.requests[3].body).toBe('{"name":"alice"}');
        expect(new Headers(transport.requests[3].headers).get('authorization')).toBe('Bearer rotated-access');
        expect(await fs.readFile(await credentialFile(), 'utf8')).toContain('rotated-refresh');
    });

    it('does not dispatch a mutation after refresh fails', async () => {
        await login();
        now += 61000;
        replies = [{ status: 400, body: { error: 'invalid_grant', message: 'secret-refresh' } }];
        await expect(api(['users/1', '--method', 'DELETE'])).rejects.toThrow(/login/i);
        expect(transport.requests).toHaveLength(3);
    });

    it.each(['https://evil.test/users', '//evil.test/users', '../users', '%2e%2e/users', 'users#fragment', '\\evil.test/users'])('rejects an escaping path: %s', async (input) => {
        await login();
        await expect(api([input])).rejects.toThrow(/path/i);
        expect(transport.requests).toHaveLength(2);
    });

    it('keeps server credentials separate and rejects insecure remote HTTP', async () => {
        await login();
        await expect(api(['users', '--server', 'https://other.example.test/'])).rejects.toThrow(/login/i);
        await expect(api(['users', '--server', 'http://other.example.test/'])).rejects.toThrow(/HTTPS/i);
        expect(transport.requests).toHaveLength(2);
    });

    it('rejects invalid methods and JSON before sending a request', async () => {
        await login();
        await expect(api(['users', '--method', 'BOGUS'])).rejects.toThrow(/method/i);
        await expect(api(['users', '--method', 'POST', '--data', '{'])).rejects.toThrow(/JSON/i);
        await expect(api(['users', '--data', '{}'])).rejects.toThrow(/GET/i);
        expect(transport.requests).toHaveLength(2);
    });

    it('does not replay failed mutations and clears the saved login on logout', async () => {
        await login();
        replies = [{ status: 401, body: { message: 'Unauthorized' } }];
        await expect(api(['users/1', '--method', 'DELETE'])).rejects.toThrow(/401/);
        expect(transport.requests).toHaveLength(3);
        await runCommand(defineCLILogoutCommand(), { rawArgs: [] });
        await expect(api()).rejects.toThrow(/login/i);
    });
    it('releases the credentials lock when login is cancelled', async () => {
        const timers = await vi.importActual<typeof Timers>('node:timers/promises');
        vi.mocked(setTimeout).mockImplementation(timers.setTimeout);
        const pending = expect(login()).rejects.toThrow();
        await vi.waitFor(() => expect(setTimeout).toHaveBeenCalled());
        process.emit('SIGINT');
        await pending;
        expect(await fs.readdir(path.join(directory, 'authup', 'credentials'))).toEqual([]);
    });

    it('retains the refresh token when a refresh response omits it', async () => {
        await login();
        now += 61000;
        replies = [{
            body: {
                access_token: 'new-access',
                expires_in: 60,
                token_type: 'Bearer',
            },
        }];
        await api();
        expect(await fs.readFile(await credentialFile(), 'utf8')).toContain('secret-refresh');
    });

    it('does not expose credential contents when stored JSON is malformed', async () => {
        await login();
        await fs.writeFile(await credentialFile(), '{"accessToken":"secret-access", broken');
        await expect(api()).rejects.toThrow('Invalid credentials file. Run authup login again.');
        expect(transport.requests).toHaveLength(2);
    });

    it('serializes commands for one server and normalizes trailing slashes', async () => {
        await login();
        const file = await credentialFile();
        await fs.writeFile(`${file}.lock`, '');
        await expect(api(['users', '--server', server.slice(0, -1)])).rejects.toThrow(/Another CLI command/);
        expect(transport.requests).toHaveLength(2);
    });

    it('sets redirect refusal and a per-request timeout on the transport', async () => {
        await login();
        await api();
        for (const request of transport.requests) {
            expect(request.redirect).toBe('error');
            expect(request.signal).toBeInstanceOf(AbortSignal);
        }
    });
});
