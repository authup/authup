/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A console must be published on the deployment's own ORIGIN. Another PATH is
 * fully supported and is what `server.<name>Console.url` is for; another
 * domain half-works rather than failing on its own, so it fails here.
 *
 * The static consoles authenticate with a `SameSite=Strict` credential the
 * API issues and re-checks with `Sec-Fetch-Site: same-origin`, so a foreign
 * origin can never sign in; the auth console holds the browser session every
 * `prompt=none` decision reads, so moving it off the issuer's origin breaks
 * silent authentication. Different domains are the named stage-G follow-up
 * and need WebAuthn origins, the federated-login cookie and credentialed CORS
 * to move together, so a warning is not the way to get there.
 *
 * Lives here rather than in one service's normalization because every service
 * that resolves a console url has to apply it: a console started through its
 * own bin never runs server-core's normalization and used to boot straight
 * into the half-working state this refuses.
 */
export function assertConsoleOrigin(
    section: string,
    url: string,
    publicUrl: string,
) : void {
    if (!url || !publicUrl) {
        return;
    }

    if (new URL(url).origin !== new URL(publicUrl).origin) {
        throw new Error(
            `${section}.url is ${url}, which is not the origin of publicUrl (${publicUrl}). ` +
            'A console may be served under a path of its own, but not under a domain of its own.',
        );
    }
}
