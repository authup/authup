/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveAccountConsoleConfig } from '@authup/server-account-console';
import { readConfig } from '@authup/server-core';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { readConsoleConfigs } from '../../src/roles/config.ts';

/**
 * What a console service ends up configured with, from the same `authup.yml`
 * every other service reads.
 *
 * Three of the values below are products of NORMALIZATION rather than of any
 * key an operator writes, so a console that were handed the raw document
 * would get a plausible-looking wrong answer instead of an error. That is not
 * hypothetical: it shipped once, and nothing in the suite noticed. The smoke
 * runner cannot cover it either, because it writes `publicUrl` into the file
 * and never sets `TRUSTED_ORIGINS`, so both hand-overs can be deleted today
 * and every test still passes.
 *
 * These assertions are written against the OUTCOME (what the console is
 * configured with) rather than against the mechanism, so they survive a
 * change in where the normalization happens.
 */
describe('readConsoleConfigs', () => {
    let directory : string;
    const env = { ...process.env };

    beforeEach(() => {
        directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'authup-console-config-')));

        for (const name of Object.keys(process.env)) {
            if (name === 'PUBLIC_URL' || name === 'TRUSTED_ORIGINS' || name === 'HOST' || name === 'PORT') {
                delete process.env[name];
            }
        }
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
        process.env = { ...env };
    });

    function write(content: string) {
        fs.writeFileSync(path.join(directory, 'authup.yml'), content);
    }

    async function read() {
        const core = await readConfig({ env: true, fs: { cwd: directory } });

        return {
            core,
            consoles: await readConsoleConfigs({ cwd: directory }, core),
        };
    }

    it('should hand every console the DERIVED public url', async () => {
        // the document names no publicUrl, so it is derived from host and
        // port. A console owns neither, and must not fall back to its own.
        write('server:\n  core:\n    port: 4711\n    host: 127.0.0.1\n');

        const { core, consoles } = await read();

        expect(core.publicUrl).toEqual('http://127.0.0.1:4711');

        for (const console of [consoles.auth, consoles.admin, consoles.account]) {
            expect(console.apiUrl).toEqual(core.publicUrl);
            expect(console.url.startsWith(core.publicUrl)).toBe(true);
        }
    });

    it('should hand the account console CANONICALIZED trusted origins', async () => {
        // a bare host is a supported short form and expands to both origins.
        // Taken verbatim it becomes the pattern `hub.local/**`, which is
        // matched against an absolute URL and therefore matches nothing, so
        // the `ref` back link disappears with no diagnostic.
        write([
            'publicUrl: https://idp.example.com',
            'trustedOrigins:',
            '  - hub.local',
            '',
        ].join('\n'));

        const { consoles } = await read();

        expect(consoles.account.trustedOrigins).toEqual(
            expect.arrayContaining(['http://hub.local', 'https://hub.local']),
        );
        expect(consoles.account.trustedOrigins).not.toContain('hub.local');
    });

    it('should resolve a relative console path against the configured rootPath', async () => {
        // the third hand-over, and the one no test has ever covered: a
        // relative path in the document means the same directory to every
        // service it configures, which is rootPath and not each process cwd.
        write([
            'publicUrl: https://idp.example.com',
            `rootPath: ${directory}`,
            'theme:',
            '  directoryPath: ./brand',
            'server:',
            '  accountConsole:',
            '    path: ./bundle',
            '',
        ].join('\n'));

        const { consoles } = await read();

        expect(consoles.account.theme.directoryPath).toEqual(path.join(directory, 'brand'));
        expect(consoles.account.distPath).toEqual(path.join(directory, 'bundle'));
    });

    it('should refuse a console published on another origin', async () => {
        write([
            'publicUrl: https://idp.example.com',
            'server:',
            '  accountConsole:',
            '    url: https://accounts.other.example.com',
            '',
        ].join('\n'));

        await expect(read()).rejects.toThrow(/not the origin of publicUrl/);
    });

    /**
     * The bin path, which is the one that was open: a console started through
     * its own entry point never runs server-core's normalization, so the
     * invariant has to hold in the resolve itself. Asserted directly against
     * the resolve rather than through readConsoleConfigs, because the read
     * above normalizes first and would throw before the console ever sees the
     * value.
     */
    it('should refuse a foreign origin on the standalone path too', () => {
        expect(() => resolveAccountConsoleConfig({
            publicUrl: 'https://idp.example.com',
            url: 'https://accounts.other.example.com',
        } as never)).toThrow(/not the origin of publicUrl/);

        // a path of its own stays fully supported
        expect(() => resolveAccountConsoleConfig({
            publicUrl: 'https://idp.example.com',
            url: 'https://idp.example.com/accounts',
        } as never)).not.toThrow();
    });
});
