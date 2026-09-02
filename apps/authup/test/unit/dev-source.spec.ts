/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSourceCheckout, loadVite } from '../../src/dev/index.ts';

const REPOSITORY_ROOT = path.join(fileURLToPath(new URL('../../', import.meta.url)), '..', '..');

describe('isSourceCheckout', () => {
    it('accepts a console app directory', () => {
        expect(isSourceCheckout(path.join(REPOSITORY_ROOT, 'apps', 'client-admin-console'))).toBe(true);
    });

    it('rejects a directory holding no vite config', () => {
        expect(isSourceCheckout(path.join(REPOSITORY_ROOT, 'apps', 'authup'))).toBe(false);
    });

    it('rejects an unresolved package', () => {
        expect(isSourceCheckout(undefined)).toBe(false);
    });
});

describe('loadVite', () => {
    it('loads the caller-provided vite', async () => {
        const vite = await loadVite('@authup/client-admin-console');

        expect(typeof vite.createServer).toEqual('function');
    });
});
