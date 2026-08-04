/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { 
    afterEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { ThemeProvider } from '../../../../../src/adapters/http/ui/theme/index.ts';

const roots : string[] = [];

function createDirectory(files: Record<string, string>) : string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-theme-provider-'));
    roots.push(root);

    for (const name of Object.keys(files)) {
        const filePath = path.join(root, name);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, files[name], 'utf-8');
    }

    return root;
}

describe('adapters/http/ui/theme (ThemeProvider)', () => {
    afterEach(() => {
        while (roots.length > 0) {
            fs.rmSync(roots.pop() as string, { recursive: true, force: true });
        }
    });

    it('should fail the boot on an invalid manifest', async () => {
        const root = createDirectory({ 'theme.json': JSON.stringify({ version: 1, tokens: { bad: 'red' } }) });

        await expect(new ThemeProvider({ directoryPath: root }).load())
            .rejects.toThrow(/theme\.json/);
    });

    it('should fail the boot on malformed JSON', async () => {
        const root = createDirectory({ 'theme.json': '{ not json' });

        // Asserts the contract (fail loud, name the file), not the wording:
        // the decode goes through locter, so the parser's own message is
        // whatever it reports.
        await expect(new ThemeProvider({ directoryPath: root }).load())
            .rejects.toThrow(/theme\.json/);
    });

    it('should load a directory carrying no manifest', async () => {
        const root = createDirectory({ 'assets/theme.css': 'body{}' });

        const provider = new ThemeProvider({ directoryPath: root });
        await provider.load();

        expect(await provider.getManifest()).toBeUndefined();
        expect(provider.getAssetsPath()).toBeDefined();
    });

    it('should report no assets path when the directory is absent', async () => {
        const root = createDirectory({ 'theme.json': JSON.stringify({ version: 1 }) });

        const provider = new ThemeProvider({ directoryPath: root });
        await provider.load();

        expect(provider.getAssetsPath()).toBeUndefined();
    });

    describe('head fragment', () => {
        const FRAGMENT = '<meta name="operator" content="acme">';

        it('should NOT read the fragment when the flag is off', async () => {
            const root = createDirectory({
                'theme.json': JSON.stringify({ version: 1 }),
                'fragments/head.html': FRAGMENT,
            });

            const provider = new ThemeProvider({ directoryPath: root });
            await provider.load();

            // Dropping the file into the directory must do nothing on its
            // own — the fragment is raw markup on the IdP origin.
            expect(await provider.getHead('')).toEqual('');
        });

        it('should read the fragment when the flag is on', async () => {
            const root = createDirectory({
                'theme.json': JSON.stringify({ version: 1 }),
                'fragments/head.html': FRAGMENT,
            });

            const provider = new ThemeProvider({
                directoryPath: root,
                fragmentsEnabled: true,
            });
            await provider.load();

            expect(await provider.getHead('')).toEqual(FRAGMENT);
        });

        it('should tolerate the flag being on with no fragment file', async () => {
            const root = createDirectory({ 'theme.json': JSON.stringify({ version: 1 }) });

            const provider = new ThemeProvider({
                directoryPath: root,
                fragmentsEnabled: true,
            });
            await provider.load();

            expect(await provider.getHead('')).toEqual('');
        });

        it('should ignore an oversized fragment', async () => {
            const root = createDirectory({
                'theme.json': JSON.stringify({ version: 1 }),
                'fragments/head.html': '<!--'.padEnd(64 * 1024 + 10, 'x'),
            });

            const provider = new ThemeProvider({
                directoryPath: root,
                fragmentsEnabled: true,
            });
            await provider.load();

            expect(await provider.getHead('')).toEqual('');
        });

        it('should serve a fragment without a manifest', async () => {
            const root = createDirectory({ 'fragments/head.html': FRAGMENT });

            const provider = new ThemeProvider({
                directoryPath: root,
                fragmentsEnabled: true,
            });
            await provider.load();

            expect(await provider.getManifest()).toBeUndefined();
            expect(await provider.getHead('')).toEqual(FRAGMENT);
        });
    });

    describe('reload', () => {
        it('should keep the last good manifest when it becomes invalid', async () => {
            const root = createDirectory({
                'theme.json': JSON.stringify({
                    version: 1,
                    tokens: { '--authup-auth-accent': 'red' },
                }),
            });

            const provider = new ThemeProvider({ directoryPath: root });
            await provider.load();
            expect(await provider.getHead('')).toContain('red');

            fs.writeFileSync(
                path.join(root, 'theme.json'),
                JSON.stringify({ version: 1, tokens: { bad: 'blue' } }),
                'utf-8',
            );

            // A broken theme must never take down a login page, so the
            // request path keeps serving the previous value.
            await new Promise((resolve) => { setTimeout(resolve, 1_100); });
            expect(await provider.getHead('')).toContain('red');
        });

        it('should pick up a valid change', async () => {
            const root = createDirectory({
                'theme.json': JSON.stringify({
                    version: 1,
                    tokens: { '--authup-auth-accent': 'red' },
                }),
            });

            const provider = new ThemeProvider({ directoryPath: root });
            await provider.load();
            expect(await provider.getHead('')).toContain('red');

            fs.writeFileSync(
                path.join(root, 'theme.json'),
                JSON.stringify({
                    version: 1,
                    tokens: { '--authup-auth-accent': 'blue' },
                }),
                'utf-8',
            );

            await new Promise((resolve) => { setTimeout(resolve, 1_100); });
            expect(await provider.getHead('')).toContain('blue');
            expect(await provider.getHead('')).not.toContain('red');
        });
    });
});
