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
import {
    ACCOUNT_CONSOLE_CONFIG_MARKER,
    AUTH_CONSOLE_CONTRACT_VERSION,
    bindConsolePackages,
} from '../../../../../src/adapters/http/ui/index.ts';

const roots : string[] = [];

function createRoot() : string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-console-pkg-'));
    roots.push(root);

    return root;
}

/**
 * A minimal stand-in for a substituted @authup/client-auth-console: the
 * dist layout server-core resolves plus an ESM server entry.
 */
function createAuthConsolePackage(serverSource: string) : string {
    const root = createRoot();

    fs.mkdirSync(path.join(root, 'dist', 'client'), { recursive: true });
    fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'dist', 'client', 'index.html'),
        '<html><head></head><body><!--app-html--></body></html>',
        'utf-8',
    );
    fs.writeFileSync(path.join(root, 'dist', 'server', 'server.js'), serverSource, 'utf-8');

    return root;
}

function createAccountConsolePackage(html: string) : string {
    const root = createRoot();

    fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist', 'index.html'), html, 'utf-8');

    return root;
}

describe('adapters/http/ui (console package contracts)', () => {
    afterEach(async () => {
        // Always unbind, or a later suite in this file resolves a removed
        // directory.
        await bindConsolePackages({});

        while (roots.length > 0) {
            fs.rmSync(roots.pop() as string, { recursive: true, force: true });
        }
    });

    it('should not assert anything without an override', async () => {
        // The packaged consoles ship with linked versions, so the assert
        // would compare a constant against itself.
        await expect(bindConsolePackages({})).resolves.toBeUndefined();
    });

    describe('auth console', () => {
        it('should accept a matching contract version', async () => {
            const root = createAuthConsolePackage(
                `export const CONTRACT_VERSION = ${AUTH_CONSOLE_CONTRACT_VERSION};\nexport function render() { return ['', '']; }\n`,
            );

            await expect(bindConsolePackages({ authConsolePath: root }))
                .resolves.toBeUndefined();
        });

        it('should treat a missing export as version 1', async () => {
            // the shape every package built before the constant existed
            // implements, and one this authup no longer accepts
            const root = createAuthConsolePackage('export function render() { return [\'\', \'\']; }\n');

            await expect(bindConsolePackages({ authConsolePath: root }))
                .rejects.toThrow(/version 1, but this authup requires 2/);
        });

        it('should reject a mismatched contract version', async () => {
            const root = createAuthConsolePackage(
                'export const CONTRACT_VERSION = 99;\nexport function render() { return [\'\', \'\']; }\n',
            );

            await expect(bindConsolePackages({ authConsolePath: root }))
                .rejects.toThrow(/version 99, but this authup requires 2/);
        });

        it('should reject a bundle without a render function', async () => {
            const root = createAuthConsolePackage('export const CONTRACT_VERSION = 1;\n');

            await expect(bindConsolePackages({ authConsolePath: root }))
                .rejects.toThrow(/does not export a render\(\) function/);
        });

        it('should reject a package with no built bundle', async () => {
            const root = createRoot();

            await expect(bindConsolePackages({ authConsolePath: root }))
                .rejects.toThrow(/carries no built bundle/);
        });
    });

    describe('account console', () => {
        it('should accept a shell carrying the config marker', async () => {
            const root = createAccountConsolePackage(
                `<html><head>${ACCOUNT_CONSOLE_CONFIG_MARKER}</head><body></body></html>`,
            );

            await expect(bindConsolePackages({ accountConsolePath: root }))
                .resolves.toBeUndefined();
        });

        it('should reject a shell without the config marker', async () => {
            // Without it the injected window.__AUTHUP__ never lands and the
            // SPA silently derives its API URL from the origin.
            const root = createAccountConsolePackage('<html><head></head><body></body></html>');

            await expect(bindConsolePackages({ accountConsolePath: root }))
                .rejects.toThrow(/carries no <!--account-config--> marker/);
        });

        it('should reject a package with no built bundle', async () => {
            const root = createRoot();

            await expect(bindConsolePackages({ accountConsolePath: root }))
                .rejects.toThrow(/carries no built bundle/);
        });
    });
});
