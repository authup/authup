/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { OAuth2AccessDeniedError, OAuth2DeviceAuthorizationError, OAuth2GrantError } from '@authup/specs';
import { setTimeout } from 'node:timers/promises';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { runDeviceLogin } from '../../src/host/device.ts';
import { createHostTransport } from '../utils/host.ts';
import type { HostRoute } from '../utils/host.ts';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

const host = 'https://auth.example.com';

const device = {
    device_code: 'secret-device',
    user_code: 'BCDF-GHJK',
    verification_uri: `${host}/device`,
    verification_uri_complete: `${host}/device?user_code=BCDF-GHJK`,
    expires_in: 600,
    interval: 5,
};

const grant = {
    access_token: 'secret-access',
    refresh_token: 'secret-refresh',
    expires_in: 900,
    token_type: 'Bearer',
};

function wire(error: unknown) {
    return JSON.parse(JSON.stringify(error));
}

describe('runDeviceLogin', () => {
    let now : number;
    let notices : string[];

    beforeEach(() => {
        now = 1_000_000;
        notices = [];
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        vi.mocked(setTimeout).mockImplementation(async (delay) => {
            now += Number(delay);
        });
        vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
            notices.push(String(chunk));
            return true;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function run(tokenAnswers: ReturnType<HostRoute>[], deviceAnswer: ReturnType<HostRoute> = { body: device }) {
        const forms : Record<string, string>[] = [];
        const transport = createHostTransport({
            'POST /device_authorization': (_request, form) => {
                forms.push(form);
                return deviceAnswer;
            },
            'POST /token': (_request, form) => {
                forms.push(form);
                return tokenAnswers.shift() ?? { status: 500, body: {} };
            },
        });
        const client = new Client({ baseURL: host, transport });

        return {
            forms,
            promise: runDeviceLogin(client, {
                clientId: 'cli',
                realm: 'master',
                scope: 'global openid',
            }),
        };
    }

    it('prints the verification url and code, polls at the interval and slows down cumulatively', async () => {
        const { forms, promise } = run([
            { status: 400, body: wire(OAuth2DeviceAuthorizationError.pending()) },
            { status: 400, body: wire(OAuth2DeviceAuthorizationError.slowDown()) },
            { status: 400, body: wire(OAuth2DeviceAuthorizationError.pending()) },
            { body: grant },
        ]);

        await expect(promise).resolves.toEqual(grant);

        expect(vi.mocked(setTimeout).mock.calls.map(([delay]) => delay)).toEqual([5000, 5000, 10000, 10000]);
        expect(forms[0]).toEqual({
            client_id: 'cli',
            realm_name: 'master',
            scope: 'global openid',
        });
        // the realm hint rides the poll too: without it the server resolves
        // the client NAME in the master realm and the redemption answers
        // invalid_grant for a client that lives anywhere else
        expect(forms[1]).toEqual({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: 'cli',
            device_code: 'secret-device',
            realm_name: 'master',
        });
        expect(notices.join('')).toContain(device.verification_uri_complete);
        expect(notices.join('')).toContain('BCDF-GHJK');
        expect(notices.join('')).not.toContain('secret-');
    });

    it('sends a uuid realm as realm_id on both calls', async () => {
        const realmId = '5f7d6f4e-2a5f-4a1e-9f1a-0c1d2e3f4a5b';
        const forms : Record<string, string>[] = [];
        const transport = createHostTransport({
            'POST /device_authorization': (_request, form) => {
                forms.push(form);
                return { body: device };
            },
            'POST /token': (_request, form) => {
                forms.push(form);
                return { body: grant };
            },
        });

        await runDeviceLogin(new Client({ baseURL: host, transport }), { clientId: 'cli', realm: realmId });

        expect(forms[0]).toEqual({ client_id: 'cli', realm_id: realmId });
        expect(forms[1]).toEqual({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: 'cli',
            device_code: 'secret-device',
            realm_id: realmId,
        });
    });

    it('names the missing grant when the server has no device endpoint', async () => {
        const transport = createHostTransport({});

        await expect(runDeviceLogin(new Client({ baseURL: host, transport }), { clientId: 'cli' }))
            .rejects.toThrow(/does not offer the device authorization grant/);
    });

    it.each([
        ['access_denied', wire(new OAuth2AccessDeniedError())],
        ['device_code_expired', wire(OAuth2DeviceAuthorizationError.expired())],
        ['invalid_grant', wire(OAuth2GrantError.invalid())],
    ])('stops on %s', async (code, body) => {
        const { promise } = run([{ status: 400, body }]);

        await expect(promise).rejects.toMatchObject({ response: { data: { code } } });
    });

    it('stops when the code runs out before an approval', async () => {
        const pending = { status: 400, body: wire(OAuth2DeviceAuthorizationError.pending()) };
        const { promise } = run(Array.from({ length: 200 }, () => pending));

        await expect(promise).rejects.toThrow(/expired before the login was confirmed/);
    });
});
