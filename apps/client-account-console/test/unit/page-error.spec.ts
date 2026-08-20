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
const store: { logout: typeof logout, refreshToken: string | null } = {
    logout,
    refreshToken: null,
};

vi.mock('@authup/client-web-kit', async () => {
    const actual = await vi.importActual<Record<string, any>>('@authup/client-web-kit');

    return {
        ...actual,
        injectStore: () => store,
    };
});

function unauthorized() {
    return Object.assign(new Error('Request failed'), { response: { status: 401, data: { code: 'identity_unauthorized' } } });
}

const { usePageError } = await import('../../src/pages/utils');

describe('usePageError', () => {
    beforeEach(() => {
        logout.mockReset();
        store.refreshToken = null;
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

    it('should log out on an authentication failure it cannot renew', async () => {
        const { error, capture } = usePageError();

        await capture(unauthorized());

        expect(logout).toHaveBeenCalledOnce();
        expect(error.value).toBeNull();
    });

    // Renewal belongs to the kit's auth hook, and by the time a 401 reaches
    // here the hook has already tried: a SUCCESSFUL refresh whose replay still
    // 401s leaves a freshly rotated refresh token behind, which the page used
    // to read as "renewable". Every Retry press then bought another refresh,
    // another replay and another rotation.
    it('should log out on a 401 the hook already failed to renew', async () => {
        store.refreshToken = 'refresh-token';

        const { error, capture } = usePageError();

        await capture(unauthorized());

        expect(logout).toHaveBeenCalledOnce();
        expect(error.value).toBeNull();
    });

    it('should coerce a thrown non-error', async () => {
        const { error, capture } = usePageError();

        await capture('boom');

        expect(error.value).toBeInstanceOf(Error);
        expect(logout).not.toHaveBeenCalled();
    });

    // A nested collection (the per-session token inventory) must not take
    // the whole page down, but a dead session still has to reach the
    // logout: a retry against one would 401 on every press.
    it('should hand a failure to a sink instead of the page error', async () => {
        const { error, capture } = usePageError();
        const sink = vi.fn();

        await capture(Object.assign(new Error('Request failed'), { response: { status: 503, data: { code: 'internal_error' } } }), sink);

        expect(sink).toHaveBeenCalledOnce();
        expect(sink.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(error.value).toBeNull();
        expect(logout).not.toHaveBeenCalled();
    });

    it('should log out on an authentication failure rather than fill the sink', async () => {
        store.refreshToken = 'refresh-token';

        const { error, capture } = usePageError();
        const sink = vi.fn();

        await capture(Object.assign(new Error('Request failed'), { response: { status: 401, data: { code: 'identity_unauthorized' } } }), sink);

        expect(logout).toHaveBeenCalledOnce();
        expect(sink).not.toHaveBeenCalled();
        expect(error.value).toBeNull();
    });
});

