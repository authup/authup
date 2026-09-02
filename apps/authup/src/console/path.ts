/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';

export function assertConsolePath(name: string, url: string) : string {
    const value = getURLBasePath(url);
    if (!value) {
        // A console with no path of its own would have to own the API's
        // root, where it would shadow the protocol routes and the page
        // GETs would redirect to themselves. Refuse it by name rather
        // than booting into a redirect loop. The origin needs no check
        // here: every console url is already refused unless it is
        // publicUrl's own origin, by the key that resolves it.
        throw new AuthupError(
            `The ${name} console url is ${url}, which is this deployment's own origin root. ` +
            'A console needs a path of its own; the defaults are under /console.',
        );
    }

    return value;
}
