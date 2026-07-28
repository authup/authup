/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------
// Prepend the bin shebang to the nitro server entry (idempotent).
// ------------------------------------------------------------------

const filePath = path.join(__dirname, '.output', 'server', 'index.mjs');

const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
if (!content.startsWith('#!')) {
    fs.writeFileSync(filePath, `#!/usr/bin/env node \n${content}`, { encoding: 'utf-8' });
}

// ------------------------------------------------------------------
// Materialize symlinks in the traced server node_modules.
//
// Nitro lays multi-version packages out as a `.nitro/<name>@<version>`
// store with symlinks for the resolvable package names (e.g.
// node_modules/hookable -> .nitro/hookable@6.1.1). `npm pack` silently
// drops symlinks, so the published tarball would miss those packages and
// bare imports would resolve against whatever (wrong) version the
// consumer's tree provides. Replace every symlink with a real copy.
//
// Node realpath-resolves symlinks, so a materialized package is no longer
// the SAME module instance as its store entry. That is safe for what the
// store actually holds today (hookable, perfect-debounce, @vue/devtools-*
// — none of them singleton-sensitive); vue and pinia are resolved from the
// top level and never enter the store. Re-check this if the store ever
// grows a package whose identity matters.
// ------------------------------------------------------------------

const serverModulesPath = path.join(__dirname, '.output', 'server', 'node_modules');

function collectSymlinks(directory, output) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) {
            output.push(entryPath);
        } else if (entry.isDirectory()) {
            collectSymlinks(entryPath, output);
        }
    }

    return output;
}

if (fs.existsSync(serverModulesPath)) {
    // fs.cpSync's dereference option does not resolve symlinks nested inside
    // the copied tree, so repeat until no symlink is left.
    for (let pass = 0; pass < 20; pass++) {
        const symlinks = collectSymlinks(serverModulesPath, []);
        if (symlinks.length === 0) {
            break;
        }

        for (const symlinkPath of symlinks) {
            const targetPath = fs.realpathSync(symlinkPath);
            fs.rmSync(symlinkPath);
            fs.cpSync(targetPath, symlinkPath, { recursive: true, dereference: true });
        }
    }

    const remaining = collectSymlinks(serverModulesPath, []);
    if (remaining.length > 0) {
        throw new Error(`Failed to materialize symlinks in ${serverModulesPath}: ${remaining.join(', ')}`);
    }

    // Every store entry has been copied to its resolvable name by now, so the
    // store itself is dead weight in the tarball.
    fs.rmSync(path.join(serverModulesPath, '.nitro'), { recursive: true, force: true });
}
