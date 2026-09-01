/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { resolvePackagePath, setPackagePath } from '@authup/server-auth-console';

/**
 * The auth console service resolves its bundle through module-level state
 * seeded at handler creation, so the package path has to be asked for the
 * same way rather than re-walked here: the anchor decides which node_modules
 * tree is searched, and it belongs to that package.
 */
export function resolveAuthConsolePackagePath(distPath?: string) : string | undefined {
    setPackagePath(distPath || undefined);

    return resolvePackagePath();
}
