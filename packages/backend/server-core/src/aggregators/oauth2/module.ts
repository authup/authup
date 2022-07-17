/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runOAuth2TokenCleaner } from './cleaner';
import { startOAuth2TokenWatcher } from './watcher';

export function buildOAuth2Aggregator() {
    function start() {
        return Promise.resolve()
            .then(() => runOAuth2TokenCleaner())
            .then(() => startOAuth2TokenWatcher());
    }

    return {
        start,
    };
}
