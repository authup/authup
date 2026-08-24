/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * What a pending console login holds while the browser is away at
 * `/authorize` (plan 088). Only what the redemption needs, and nothing a
 * leaked entry would make redeemable on its own: the browser additionally
 * has to present the login cookie naming it.
 */
export type ConsoleLoginPending = {
    /**
     * The `state` the authorize request carried. Validated against the
     * callback's own `state` BEFORE the entry is consumed, so a second tab's
     * callback cannot burn the first tab's login.
     */
    state: string,
    /**
     * The PKCE verifier the token exchange presents. The console client is
     * public, so a code cannot be redeemed without it.
     */
    codeVerifier: string,
    /**
     * The `redirect_uri` the authorize request carried. RFC 6749 §4.1.3
     * requires the token request to repeat it verbatim, and the verifier
     * compares the raw stored string, so it is replayed from here rather than
     * rebuilt from the callback URL.
     */
    redirectUri: string,
    /**
     * The realm the login was started in. Required: the console client is
     * identified by NAME, and a name-identified client needs a realm hint at
     * `/authorize` and at `/token` alike (client names are unique per realm,
     * and every realm carries the same-named system clients).
     */
    realmId: string,
};

export interface IConsoleLoginStore {
    /**
     * @returns the id of the pending login
     */
    save(data: ConsoleLoginPending) : Promise<string>;

    /**
     * Reads WITHOUT dropping, so the callback can check `state` before it
     * spends anything. One browser holds one login cookie, so a second tab's
     * kick overwrites the first tab's id: consuming before the check would let
     * tab A's stale callback burn tab B's live login. A read alone redeems
     * nothing: the entry still has to be consumed, and the code still has to
     * match the verifier it holds.
     */
    find(id: string) : Promise<ConsoleLoginPending | null>;

    /**
     * Reads and DROPS it. Single use: one pending login redeems once.
     */
    consume(id: string) : Promise<ConsoleLoginPending | null>;
}
