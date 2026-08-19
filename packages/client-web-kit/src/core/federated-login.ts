/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global window */
import { createNanoID } from '@authup/kit';

/**
 * Where the pending federated-login challenge is kept between the hop to the
 * external provider and the return to the hosted authorize page. Session
 * storage, so it belongs to this origin and this tab, and cannot be written
 * from another origin.
 */
const FEDERATED_LOGIN_CHALLENGE_KEY = 'authup:federated:challenge';

export function createFederatedLoginChallenge() : string {
    const challenge = createNanoID(32);

    try {
        window.sessionStorage.setItem(FEDERATED_LOGIN_CHALLENGE_KEY, challenge);
    } catch {
        // a browser with storage disabled: the login still starts and the
        // server refuses the redemption, which is the fail-closed direction
    }

    return challenge;
}

/**
 * Reads AND drops the challenge. Single use: the handle it authorizes is
 * single use too.
 */
export function consumeFederatedLoginChallenge() : string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const challenge = window.sessionStorage.getItem(FEDERATED_LOGIN_CHALLENGE_KEY);
        window.sessionStorage.removeItem(FEDERATED_LOGIN_CHALLENGE_KEY);

        return challenge;
    } catch {
        return null;
    }
}
