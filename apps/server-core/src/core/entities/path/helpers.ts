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

    if (splitPath(path).length > PATH_MAX_DEPTH) {
        throw new ValidationError(`The path must not be nested deeper than ${PATH_MAX_DEPTH} levels.`);
    }
}

/**
 * Creates every missing folder of `input` in `realmId` (mkdir -p) and answers
 * the leaf. A concurrent caller may win the (realmId, path) unique key for a
 * segment; the adapter reports that as EntityConflictError, and the chain
 * continues on the row that won.
 */
export async function ensurePath(
    repository: IPathRepository,
    realmId: string,
    input: string,
) : Promise<Path> {
    const path = input.trim().toLowerCase();

    try {
        isPathValid(path, { throwOnFailure: true });
    } catch (e) {
        throw new ValidationError(e instanceof Error ? e.message : 'The path is not valid.');
    }

    assertPathBounds(path);

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

            try {
                entity = await repository.save(draft);
            } catch (e) {
                if (!isEntityConflictError(e)) {
                    throw e;
                }

                entity = await repository.findOneBy({
                    realmId,
                    path: current,
                });

                if (!entity) {
                    throw e;
                }
            }
        }

        parent = entity;
    }

    return parent as Path;
}
