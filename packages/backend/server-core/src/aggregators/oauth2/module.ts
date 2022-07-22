/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runOAuth2Cleaner } from './cleaner';
import { OAuth2AggregatorContext } from './type';

export function buildOAuth2Aggregator(context?: OAuth2AggregatorContext) {
    context ??= {};
    context.cleaner ??= true;

    function start() {
        return Promise.resolve()
            .then(() => {
                if (context.cleaner) {
                    return runOAuth2Cleaner();
                }

                return Promise.resolve();
            });
    }

    return {
        start,
    };
}
