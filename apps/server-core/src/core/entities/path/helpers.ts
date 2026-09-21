/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError, isEntityConflictError } from '@authup/errors';
import type { Path } from '@authup/core-kit';
import {
    PATH_MAX_DEPTH,
    PATH_MAX_LENGTH,
    PATH_SEGMENT_MAX_LENGTH,
    isPathValid,
    joinPath,
    splitPath,
} from '@authup/core-kit';
import type { IPathRepository } from './types.ts';

export function buildPathForParent(parent: Path | null, name: string) : string {
    return joinPath(parent ? parent.path : '', name);
}

export function assertPathBounds(path: string) : void {
    if (path.length > PATH_MAX_LENGTH) {
        throw new ValidationError(`The path must not be longer than ${PATH_MAX_LENGTH} characters.`);
    }

    const segments = splitPath(path);
    if (segments.length > PATH_MAX_DEPTH) {
        throw new ValidationError(`The path must not be nested deeper than ${PATH_MAX_DEPTH} levels.`);
    }

    // the per-segment bound is the validator's on an API write, but ensurePath
    // builds its segments straight from caller input, so it is asserted here
    // for every caller rather than once per entry point
    for (const segment of segments) {
        if (segment.length > PATH_SEGMENT_MAX_LENGTH) {
            throw new ValidationError(`A path segment must not be longer than ${PATH_SEGMENT_MAX_LENGTH} characters.`);
        }
    }
}

/** How many times a walk refused by a concurrent walker is re-run. */
const ENSURE_PATH_ATTEMPTS = 3;

/**
 * Walk the chain, creating what is missing. Every ancestor it finds is read
 * through the repository it is given, so under the transaction-bound one each
 * is held for the walk: an ancestor cannot be renamed between the read that
 * resolves it and the insert of the child underneath, which would otherwise
 * store a path the row's own parent chain contradicts.
 */
async function walkPath(
    repository: IPathRepository,
    realmId: string,
    path: string,
) : Promise<Path> {
    let parent: Path | null = null;
    let current = '';

    for (const segment of splitPath(path)) {
        current = joinPath(current, segment);


        let entity = await repository.findOneBy({
            realmId,
            path: current,
        });

        if (!entity) {
            const draft = repository.create({
                name: segment,
                path: current,
                parentId: parent ? parent.id : null,
                realmId,
                displayName: null,
                description: null,
            });


            entity = await repository.save(draft);
        }

        parent = entity;
    }

    return parent as Path;
}

/**
 * Creates every missing folder of `input` in `realmId` (mkdir -p) and answers
 * the leaf.
 *
 * Two walkers can reach the same missing segment, and the loser's insert is
 * refused by the (realmId, path) unique key. That refusal cannot be recovered
 * from where it is raised: postgres aborts the whole transaction on a failed
 * statement, so a re-read inside it would fail too. The rolled-back walk is
 * re-run instead, and the second pass reads the row the winner committed.
 */
export async function ensurePath(
    repository: IPathRepository,
    realmId: string,
    input: string,
) : Promise<Path> {
    const path = input.trim().toLowerCase();

    let valid: boolean;
    try {
        valid = isPathValid(path, { throwOnFailure: true });
    } catch (e) {
        throw new ValidationError(e instanceof Error ? e.message : 'The path is not valid.');
    }

    // the throwing form reports every rejection it knows about, but the
    // verdict is the contract: a refusal that stops reaching for the throw
    // must not pass here as a created chain
    if (!valid) {
        throw new ValidationError('The path is not valid.');
    }

    assertPathBounds(path);

    let lastError: unknown;

    for (let attempt = 1; attempt <= ENSURE_PATH_ATTEMPTS; attempt++) {
        try {
            return await repository.transaction(
                (bound) => walkPath(bound, realmId, path),
            );
        } catch (e) {
            if (!isEntityConflictError(e)) {
                throw e;
            }

            lastError = e;
        }
    }

    throw lastError;
}
