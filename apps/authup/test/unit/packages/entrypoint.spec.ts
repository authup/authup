/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import {
    buildPackageProcessArgv,
    resolvePackageEntrypoint,
} from '../../../src/packages';

const PACKAGE_NAME = '@authup/server-core';
const BIN_NAME = 'authup-server';

let baseDirectory : string;
let treeA : string;
let treeB : string;
let treeStringBin : string;
let treeNoBin : string;
let treeEmpty : string;

function writePackageManifest(
    tree: string,
    manifest: Record<string, unknown>,
) : string {
    const directory = path.join(tree, 'node_modules', PACKAGE_NAME);
    fs.mkdirSync(directory, { recursive: true });

    const manifestPath = path.join(directory, 'package.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    return directory;
}

beforeAll(() => {
    baseDirectory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'authup-entrypoint-')));

    treeA = path.join(baseDirectory, 'tree-a');
    treeB = path.join(baseDirectory, 'tree-b');
    treeStringBin = path.join(baseDirectory, 'tree-string-bin');
    treeNoBin = path.join(baseDirectory, 'tree-no-bin');
    treeEmpty = path.join(baseDirectory, 'tree-empty');

    writePackageManifest(treeA, {
        name: PACKAGE_NAME,
        version: '1.0.0',
        bin: { [BIN_NAME]: 'dist/cli/index.mjs' },
    });

    writePackageManifest(treeB, {
        name: PACKAGE_NAME,
        version: '1.0.0',
        bin: { [BIN_NAME]: 'dist/other/entry.mjs' },
    });

    writePackageManifest(treeStringBin, {
        name: PACKAGE_NAME,
        version: '1.0.0',
        bin: 'dist/single.mjs',
    });

    writePackageManifest(treeNoBin, {
        name: PACKAGE_NAME,
        version: '1.0.0',
    });

    fs.mkdirSync(treeEmpty, { recursive: true });
});

afterAll(() => {
    fs.rmSync(baseDirectory, { recursive: true, force: true });
});

describe('src/packages/entrypoint', () => {
    it('should resolve the bin entry of the target package', async () => {
        const entrypoint = await resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeA]);

        expect(entrypoint).toEqual({
            type: 'node',
            path: path.join(treeA, 'node_modules', PACKAGE_NAME, 'dist/cli/index.mjs'),
        });
    });

    it('should prefer the first successful lookup directory', async () => {
        const entrypoint = await resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeA, treeB]);

        expect(entrypoint).toEqual({
            type: 'node',
            path: path.join(treeA, 'node_modules', PACKAGE_NAME, 'dist/cli/index.mjs'),
        });
    });

    it('should fall through to a later lookup directory', async () => {
        const entrypoint = await resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeEmpty, treeB]);

        expect(entrypoint).toEqual({
            type: 'node',
            path: path.join(treeB, 'node_modules', PACKAGE_NAME, 'dist/other/entry.mjs'),
        });
    });

    it('should support a string-form bin field', async () => {
        const entrypoint = await resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeStringBin]);

        expect(entrypoint).toEqual({
            type: 'node',
            path: path.join(treeStringBin, 'node_modules', PACKAGE_NAME, 'dist/single.mjs'),
        });
    });

    it('should fail loudly when the bin entry is missing', async () => {
        await expect(resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeNoBin]))
            .rejects
            .toThrow(new RegExp(`does not expose a "${BIN_NAME}" bin entry`));
    });

    it('should fall back to npx when the package cannot be resolved', async () => {
        const entrypoint = await resolvePackageEntrypoint(PACKAGE_NAME, BIN_NAME, [treeEmpty]);

        expect(entrypoint).toEqual({
            type: 'npx',
            packageName: PACKAGE_NAME,
        });
    });

    it('should build node argv for a resolved entrypoint', () => {
        const argv = buildPackageProcessArgv(
            { type: 'node', path: '/pkg/dist/cli/index.mjs' },
            ['start', '--configDirectory=/etc/authup'],
        );

        expect(argv).toEqual({
            exec: process.execPath,
            args: ['/pkg/dist/cli/index.mjs', 'start', '--configDirectory=/etc/authup'],
        });
    });

    it('should build npx argv for the fallback entrypoint', () => {
        const argv = buildPackageProcessArgv(
            { type: 'npx', packageName: PACKAGE_NAME },
            ['start'],
        );

        expect(argv).toEqual({
            exec: 'npx',
            args: ['--yes', PACKAGE_NAME, 'start'],
        });
    });
});
