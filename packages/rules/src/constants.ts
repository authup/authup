/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum DecisionStrategy {
    /**
     * One or more positive
     */
    AFFIRMATIVE = 'affirmative',
    /**
     * All positive
     */
    UNANIMOUS = 'unanimous',
    /**
     * More positive than negative
     */
    CONSENSUS = 'consensus',
}
