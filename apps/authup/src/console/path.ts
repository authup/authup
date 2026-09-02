/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';

export function assertConsolePath(name: string, url: string, publicUrl: string) : string {
    const base = getURLBasePath(publicUrl);
    const publicPath = getURLBasePath(url);

    if (base && publicPath !== base && !publicPath.startsWith(`${base}/`)) {
        // Only reachable when a console url names a path outside the one
        // authup is published under, which the proxy routes nothing to: the
        // rule that reaches this listener is publicUrl's own. Refuse it
        // rather than mount where no request can arrive.
        throw new AuthupError(
            `The ${name} console url is ${url}, which is outside ${publicUrl}, the path this deployment is published under. ` +
            'A console shares the deployment\'s path prefix; the defaults are under /console.',
        );
    }

    // The mount is the console path RELATIVE to what the listener sees. A
    // console url is where a BROWSER reaches the console, so under a sub-path
    // deployment it carries publicUrl's own prefix, and the proxy strips that
    // prefix before the request arrives, exactly as it does for every
    // server-core route (all of which are mounted root-relative). Mounting the
    // browser-facing path would put the console where nothing can reach it.
    const value = publicPath.slice(base.length);
    if (!value) {
        // A console with no path of its own would have to own the API's
        // root, where it would shadow the protocol routes and the page
        // GETs would redirect to themselves. Refuse it by name rather
        // than booting into a redirect loop. The origin needs no check
        // here: every console url is already refused unless it is
        // publicUrl's own origin, by the key that resolves it.
        throw new AuthupError(
            `The ${name} console url is ${url}, which is this deployment's own root. ` +
            'A console needs a path of its own; the defaults are under /console.',
        );
    }

    return value;
}
