/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { removeExpiredOAuth2Tokens, startOAuth2TokenWatcher } from '../http/oauth2';

export function buildTokenAggregator() {
    function start() {
        return Promise.resolve()
            .then(() => removeExpiredOAuth2Tokens())
            .then(() => startOAuth2TokenWatcher());
    }

    return {
        start,
    };
}
