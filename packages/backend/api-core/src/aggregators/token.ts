/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { removeExpiredOAuth2Tokens, startOAuth2TokenWatcher } from '../http/oauth2';
import { Config } from '../config';

export function buildTokenAggregator(config?: Config) {
    function start() {
        return Promise.resolve()
            .then(() => removeExpiredOAuth2Tokens())
            .then(() => startOAuth2TokenWatcher(config));
    }

    return {
        start,
    };
}
