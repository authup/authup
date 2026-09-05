/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../src';

describe('resolveConfig', () => {
    /**
     * The file reader hands values over verbatim, and `authup config validate`
     * refuses a non-boolean here; the resolve has to refuse it too, or a
     * document the validator rejects boots with fragments enabled.
     */
    it('should refuse a value the document schema rejects', async () => {
        await expect(resolveConfig({
            publicUrl: 'https://example.com',
            theme: { fragmentsEnabled: 'no' },
        } as never)).rejects.toThrow();
    });
});
