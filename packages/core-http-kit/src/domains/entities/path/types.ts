/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntitySchemaAPI, IEntityStatsAPI } from '../../stats';
import type { IEntityAPI } from '../../types-base';

import type { Path } from '@authup/core-kit';

// Mirrors `PathValidator` mounts in @authup/core-kit. The full `path` is
// derived by the server from the parent chain and this folder's own `name`,
// so a caller never sends it.
export type PathCreatePayload = Pick<Path, 'name'> &
    Partial<Pick<Path, 'parentId' | 'displayName' | 'description' | 'realmId'>>;
export type PathUpdatePayload = Partial<Pick<Path, 'name' | 'parentId' | 'displayName' | 'description'>>;

export interface IPathAPI extends IEntityAPI<Path, PathCreatePayload, PathUpdatePayload>,
    IEntitySchemaAPI, IEntityStatsAPI<Path> {}
