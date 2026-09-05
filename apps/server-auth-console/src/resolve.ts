/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { locateUpSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_PATH } from './path';

/**
 * Locate the auth console package: a substituted one (config `distPath`)
 * first, else the SSR auth workflow UI shipped as
 * `@authup/client-auth-console` (a dependency of THIS service), which the
 * node_modules ancestor walk from this package's own root (locter's
 * `locateUp`) finds for the workspace (symlink onto
 * apps/client-auth-console) and for a published install alike.
 *
 * The `cwd` anchor is behavioural, not incidental: it decides which
 * node_modules tree is walked, so it stays pinned to this package rather
 * than to the process cwd.
 */
export function resolvePackagePath(distPath?: string) : string | undefined {
    return distPath || locateUpSync(
        'node_modules/@authup/client-auth-console/package.json',
        { cwd: PACKAGE_PATH },
    )?.directory;
}

/**
 * Locate the BUILT auth console bundle (`dist/client` template + assets,
 * `dist/server/server.js` render entry). A half-built package is no bundle:
 * without the render entry there is nothing to render with.
 */
export function resolveDistPath(distPath?: string) : string | undefined {
    const packagePath = resolvePackagePath(distPath);
    if (!packagePath) {
        return undefined;
    }

    const candidate = path.join(packagePath, 'dist');
    if (
        fs.existsSync(path.join(candidate, 'client', 'index.html')) &&
        fs.existsSync(path.join(candidate, 'server', 'server.js'))
    ) {
        return candidate;
    }

    return undefined;
}
