/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runCommand } from 'citty';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createCLIEntryPointCommand } from '../../src/module.ts';

/**
 * The probe cannot be observed through a socket: every host a dev box can dial
 * resolves to loopback, so a listener bound to one interface and a probe
 * dialing `localhost` look the same. What the command hands `http.request` is
 * the contract, so that is what the spec reads.
 */
type ProbeTarget = {
    host: string,
    port: string,
};

async function probe(directory: string) : Promise<ProbeTarget> {
    const request = vi.spyOn(http, 'request')
        .mockImplementation((() => ({ on: vi.fn(), end: vi.fn() })) as never);

    try {
        await runCommand(await createCLIEntryPointCommand(), { rawArgs: ['--configDirectory', directory, 'healthcheck'] });

        expect(request).toHaveBeenCalledTimes(1);

        const [target] = request.mock.calls[0];
        if (typeof target === 'string' || target instanceof URL) {
            const url = new URL(target);
            return { host: url.hostname, port: url.port };
        }

        const options = target as unknown as { host?: string, port?: number };
        return { host: options.host ?? '', port: String(options.port ?? '') };
    } finally {
        request.mockRestore();
    }
}

describe('defineCLIHealthCheckCommand', () => {
    let directory : string;

    beforeEach(async () => {
        directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-cli-healthcheck-'));
        // an operator shell's HOST must not leak into the file-based cases
        vi.stubEnv('HOST', '');
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    it('should probe the deployment-wide host the listener inherits', async () => {
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'host: 10.0.0.5\ncore:\n  port: 4000\n',
        );

        expect(await probe(directory)).toEqual({ host: '10.0.0.5', port: '4000' });
    });

    it('should honour HOST from the environment', async () => {
        vi.stubEnv('HOST', '10.0.0.6');

        expect((await probe(directory)).host).toEqual('10.0.0.6');
    });

    it('should prefer the host the core section names', async () => {
        vi.stubEnv('HOST', '10.0.0.6');
        await fs.promises.writeFile(
            path.join(directory, 'authup.yml'),
            'core:\n  host: 10.0.0.7\n',
        );

        expect((await probe(directory)).host).toEqual('10.0.0.7');
    });

    it('should loop back for a wildcard bind, which is not dialable', async () => {
        vi.stubEnv('HOST', '0.0.0.0');

        expect((await probe(directory)).host).toEqual('127.0.0.1');
    });
});
