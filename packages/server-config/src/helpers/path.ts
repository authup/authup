/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';

/**
 * A configured path, made absolute against the deployment's `rootPath`.
 *
 * The body of every path key's `resolve`. Against `rootPath` rather than the
 * process working directory, because one document has to mean the same
 * directory to every service it configures, and those services are not
 * started from the same place: the CLI used to do this for the consoles and a
 * console started through its own bin therefore resolved against its own cwd.
 *
 * An empty value stays empty: it is how a path key says "off" (no theme, no
 * substituted package), and resolving it would turn that into `rootPath`.
 */
export function resolveRootRelativePath(value: string | undefined, rootPath: string) : string {
    if (!value) {
        return '';
    }

    return path.resolve(rootPath || process.cwd(), value);
}
