/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ReadScope } from '@authup/access';
import type { ActorContext } from '@authup/server-kit';
import type { IQuery } from '@rapiq/core';

/**
 * A service whose collection read is gated by `scopeReadQuery`, exposing
 * the gate so a statistic over the same entity applies it verbatim.
 */
export interface IReadScoper {
    scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope>;
}
