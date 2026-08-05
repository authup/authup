/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global document */

import { CookieName } from '@authup/core-http-kit';

/**
 * Read the realm of the IdP's own SSO session, if one exists.
 *
 * This console keeps its tokens under its own cookie namespace (plan 087),
 * so it cannot see, and must not use, the session the hosted auth pages hold
 * on the same origin. But it still needs that session's REALM: a visitor
 * arriving from another application has no tokens here yet, and without a
 * realm the shell would show a realm chooser to somebody who is plainly
 * signed in on the IdP.
 *
 * So this reads exactly one value out of the bare tier, to name the realm to
 * authorize against. The tokens beside it are deliberately not read: the
 * whole point of the namespace is that this console obtains its own.
 */
export function readSsoRealmId() : string | undefined {
    if (typeof document === 'undefined') {
        return undefined;
    }

    // The bare tier is what the hosted auth pages write, so the name carries
    // no prefix. Reading it through `CookieName` keeps it tied to the kit's
    // vocabulary rather than a literal that could drift.
    const pattern = new RegExp(`(?:^|;\\s*)${CookieName.REALM}=([^;]+)`);
    const match = document.cookie.match(pattern);
    const raw = match?.[1];
    if (!raw) {
        return undefined;
    }

    // The value is a JSON `{ id, name }` written by the store. Both the
    // percent-decoding and the parse are attacker-adjacent (any same-origin
    // script can write a cookie), so a malformed value must degrade to "no
    // SSO session" rather than throw out of a render.
    try {
        const parsed = JSON.parse(decodeURIComponent(raw));

        if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.id === 'string' &&
            parsed.id.length > 0
        ) {
            return parsed.id;
        }
    } catch {
        // ignore: a bad cookie means the chooser, never a broken page.
    }

    return undefined;
}
