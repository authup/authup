/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    beforeEach, 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';

const logout = vi.fn();

vi.mock('@authup/client-web-kit', async () => {
    const actual = await vi.importActual<Record<string, any>>('@authup/client-web-kit');

    return {
        ...actual,
        injectStore: () => ({ logout }),
    };
});

const { usePageError } = await import('../../src/pages/utils');

describe('usePageError', () => {
    beforeEach(() => {
        logout.mockReset();
    });

    it('should hold a failure as a retryable error state', async () => {
        const {
            error, 
            capture, 
            reset, 
        } = usePageError();
        const failure = Object.assign(new Error('Request failed'), { response: { status: 500, data: { code: 'internal_error' } } });

        await capture(failure);

        expect(error.value).toBe(failure);
        expect(logout).not.toHaveBeenCalled();

        reset();

        expect(error.value).toBeNull();
    });

    it('should log out on an authentication failure instead of offering a retry', async () => {
        const { error, capture } = usePageError();

        await capture(Object.assign(new Error('Request failed'), { response: { status: 401, data: { code: 'identity_unauthorized' } } }));

        expect(logout).toHaveBeenCalledOnce();
        expect(error.value).toBeNull();
    });

    it('should coerce a thrown non-error', async () => {
        const { error, capture } = usePageError();

        await capture('boom');

        expect(error.value).toBeInstanceOf(Error);
        expect(logout).not.toHaveBeenCalled();
    });
});
