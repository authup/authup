/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { PolicyTransitionSink } from './types.ts';

export type PolicyTransitionCollector = PolicyTransitionSink & {
    /**
     * The earliest reported instant, or undefined when nothing reported one.
     */
    readonly next: Date | undefined
};

/**
 * A sink keeping the earliest reported instant, which is the moment an answer
 * built from every evaluation it was handed to stops being current.
 */
export function createPolicyTransitionCollector() : PolicyTransitionCollector {
    let next : Date | undefined;

    return {
        report(at: Date) {
            if (!next || at.getTime() < next.getTime()) {
                next = at;
            }
        },
        get next() {
            return next;
        },
    };
}
