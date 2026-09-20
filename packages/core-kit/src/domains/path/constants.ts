/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const PATH_SEPARATOR = '/';

export const PATH_SEGMENT_MAX_LENGTH = 128;

export const PATH_MAX_LENGTH = 255;

// MySQL refuses cascading deletes nested deeper than 15 levels, and a
// folder's delete cascades through parent_id. The service refuses a deeper
// chain so a delete can never fail on one dialect and pass on the other.
export const PATH_MAX_DEPTH = 15;
