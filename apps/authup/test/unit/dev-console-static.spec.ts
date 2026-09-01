/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import {
    afterAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createViteReadShell } from '../../src/dev/index.ts';
import { captureEvent } from '../utils/event.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-dev-'));
fs.writeFileSync(path.join(root, 'index.html'), '<html><body><!--admin-config--></body></html>');

afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe('createViteReadShell', () => {
    it('reads the source shell and hands it to vite with the request path', async () => {
        const seen : string[] = [];

        const vite : Pick<ViteDevServer, 'transformIndexHtml'> = {
            transformIndexHtml: async (url: string, html: string) => {
                seen.push(url);

                return html.replace('<body>', '<body><script type="module" src="/@vite/client"></script>');
            },
        };

        const readShell = createViteReadShell(vite, root);

        const html = await readShell(await captureEvent('/users/1'));

        expect(seen).toEqual(['/users/1']);
        expect(html).toContain('/@vite/client');
        expect(html).toContain('<!--admin-config-->');
    });
});
