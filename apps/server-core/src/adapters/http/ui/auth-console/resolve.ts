/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { locateUpSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_PATH } from '../../../../path.ts';

let cachedPackagePath: string | undefined;
let cachedDistPath: string | undefined;
let overridePackagePath: string | undefined;

/**
 * Point the resolution at a substituted package (config `authConsolePath`)
 * instead of the node_modules walk. Called once at boot.
 */
export function setAuthConsolePackagePath(value: string | undefined) : void {
    overridePackagePath = value || undefined;
    cachedPackagePath = undefined;
    cachedDistPath = undefined;
}

/**
 * Locate the auth console package. The SSR auth workflow UI ships as
 * `@authup/client-auth-console` (a server-core dependency), so the
 * node_modules ancestor walk from server-core's own package root (locter's
 * `locateUp`) finds it for the workspace (symlink onto
 * apps/client-auth-console) and for a published install alike. Only a
 * positive result is cached.
 */
export function resolveAuthConsolePackagePath() : string | undefined {
    if (cachedPackagePath) {
        return cachedPackagePath;
    }

    if (overridePackagePath) {
        cachedPackagePath = overridePackagePath;

        return cachedPackagePath;
    }

    const manifest = locateUpSync(
        'node_modules/@authup/client-auth-console/package.json',
        { cwd: PACKAGE_PATH },
    );
    if (manifest) {
        cachedPackagePath = manifest.directory;
    }

    return cachedPackagePath;
}

/**
 * Locate the BUILT auth console bundle (`dist/client` template + assets,
 * `dist/server/server.js` render entry). Only a positive result is cached —
 * a dev building the package after boot is picked up on the next request.
 */
export function resolveAuthConsoleDistPath() : string | undefined {
    if (cachedDistPath) {
        return cachedDistPath;
    }

    const packagePath = resolveAuthConsolePackagePath();
    if (packagePath) {
        const distPath = path.join(packagePath, 'dist');

        if (fs.existsSync(path.join(distPath, 'client', 'index.html'))) {
            cachedDistPath = distPath;
        }
    }

    return cachedDistPath;
}
