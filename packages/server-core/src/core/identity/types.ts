/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { DeepPartial } from 'typeorm';

export type IIdentityFindWhereOptions<
    T extends ObjectLiteral = ObjectLiteral,
> = DeepPartial<T>;

export type IdentityFindOneOptions<
    T extends ObjectLiteral = ObjectLiteral,
> = {
    where: IIdentityFindWhereOptions<T>
};
