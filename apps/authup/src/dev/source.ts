/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, normalizeError } from '@authup/errors';
import fs from 'node:fs';
import path from 'node:path';
import type { ViteModule } from './types.ts';

/**
 * Whether a resolved console package is a SOURCE checkout rather than a
 * published bundle. There is deliberately no configuration key behind this:
 * a published console ships `files: ["dist"]`, so it carries no vite config,
 * while the workspace symlink and an integrator's substituted checkout both
 * do. The rule is therefore the fact itself, not a declaration of it.
 */
export function isSourceCheckout(packagePath: string | undefined) : packagePath is string {
    if (!packagePath) {
        return false;
    }

    return fs.existsSync(path.join(packagePath, 'vite.config.ts'));
}

/**
 * Vite is imported lazily and is never a dependency of this package: dev mode
 * is reached only when a source checkout was found, and whoever holds that
 * checkout is already building it. The failure has to name what to do,
 * because the alternative is an unresolved bare specifier.
 */
export async function loadVite(packageName: string) : Promise<ViteModule> {
    try {
        return await import('vite');
    } catch (e) {
        // The reason is carried, message only: an unresolved bare specifier
        // and a vite that threw while evaluating are the same failure here,
        // and the second says nothing without its cause. A stack would bury
        // the one line that says what to do.
        throw new AuthupError(
            `Serving ${packageName} from source needs vite, which could not be loaded: ` +
            `${normalizeError(e).message}. ` +
            'Install vite in this project, or point the console\'s path at a built package.',
        );
    }
}
