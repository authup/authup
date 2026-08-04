/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, normalizeError } from '@authup/errors';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import {
    resolveAccountConsoleDistPath,
    setAccountConsolePackagePath,
} from '../account-console/index.ts';
import { resolveAuthConsoleDistPath, setAuthConsolePackagePath } from '../auth-console/index.ts';
import type { ConsolePackageOptions } from './types.ts';

/**
 * The render-contract version server-core compiles against. Must match the
 * `CONTRACT_VERSION` the auth console bundle exports.
 *
 * Bump alongside `apps/client-auth-console/src/contract.ts` whenever a
 * change breaks a package built against the previous shape.
 */
export const AUTH_CONSOLE_CONTRACT_VERSION = 1;

/**
 * The marker the account console's index.html must carry. It is that
 * console's entire runtime contract: without it the injected
 * `window.__AUTHUP__` never lands and the SPA silently falls back to
 * deriving its API URL from the origin.
 */
export const ACCOUNT_CONSOLE_CONFIG_MARKER = '<!--account-config-->';

/**
 * Bind the substituted console packages and verify they still fulfill the
 * contracts, before the first request rather than per render.
 *
 * Only runs for a package the operator actually substituted. With the
 * default resolution the console packages ship from this repo with linked
 * versions, so the assert would compare a constant against itself, and
 * loading the SSR bundle at boot would turn a missing build into a failed
 * start instead of an actionable error on the page.
 *
 * Fail-closed on a mismatch: the operator replaced the login and consent
 * IMPLEMENTATION (the prompt ladder, PKCE and state handling, MFA
 * ordering, redirect gating), so a contract drift must stop the container
 * rather than render subtly wrong auth pages.
 */
export async function bindConsolePackages(options: ConsolePackageOptions = {}) : Promise<void> {
    setAuthConsolePackagePath(options.authConsolePath);
    setAccountConsolePackagePath(options.accountConsolePath);

    if (options.authConsolePath) {
        await assertAuthConsoleContract(options.authConsolePath);
    }

    if (options.accountConsolePath) {
        assertAccountConsoleContract(options.accountConsolePath);
    }
}

async function assertAuthConsoleContract(packagePath: string) : Promise<void> {
    const distPath = resolveAuthConsoleDistPath();
    if (!distPath) {
        throw new AuthupError(
            `The auth console package at "${packagePath}" carries no built bundle (expected dist/client/index.html).`,
        );
    }

    const entry = path.join(distPath, 'server', 'server.js');

    let module : Record<string, any>;
    try {
        module = await read(entry) as Record<string, any>;
    } catch (e) {
        const reason = normalizeError(e).message;

        throw new AuthupError(`The auth console render entry "${entry}" could not be loaded.\n  ${reason}`);
    }

    if (typeof module.render !== 'function') {
        throw new AuthupError(`The auth console bundle "${entry}" does not export a render() function.`);
    }

    // A bundle predating the export counts as version 1, the shape every
    // package built before the constant existed implements.
    const version = typeof module.CONTRACT_VERSION === 'undefined' ?
        1 :
        module.CONTRACT_VERSION;

    if (version !== AUTH_CONSOLE_CONTRACT_VERSION) {
        throw new AuthupError(
            `The auth console package at "${packagePath}" implements render-contract version ${version}, but this authup requires ${AUTH_CONSOLE_CONTRACT_VERSION}. Rebuild it against the current @authup/client-auth-console contract.`,
        );
    }
}

function assertAccountConsoleContract(packagePath: string) : void {
    const distPath = resolveAccountConsoleDistPath();
    if (!distPath) {
        throw new AuthupError(
            `The account console package at "${packagePath}" carries no built bundle (expected dist/index.html).`,
        );
    }

    const entry = path.join(distPath, 'index.html');
    const html = fs.readFileSync(entry, 'utf-8');

    if (!html.includes(ACCOUNT_CONSOLE_CONFIG_MARKER)) {
        throw new AuthupError(
            `The account console shell "${entry}" carries no ${ACCOUNT_CONSOLE_CONFIG_MARKER} marker, so its runtime configuration cannot be injected.`,
        );
    }
}
