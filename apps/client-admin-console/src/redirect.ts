/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LoginRedirectOptions } from '@authup/client-web-kit';

export const ADMIN_LOGIN_REDIRECT_STORAGE_KEY = 'authup:admin:redirect';

/**
 * The post-login destination stash of this console. Its own key, because
 * every console on the IdP origin shares one `sessionStorage`.
 */
export const LOGIN_REDIRECT_OPTIONS : LoginRedirectOptions = { storageKey: ADMIN_LOGIN_REDIRECT_STORAGE_KEY };
