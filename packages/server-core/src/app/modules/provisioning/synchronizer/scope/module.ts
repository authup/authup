/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ScopeProvisioningContainer } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { ScopeProvisioningSynchronizerContext } from './types.ts';

export class ScopeProvisioningSynchronizer extends BaseProvisioningSynchronizer<ScopeProvisioningContainer> {
    protected repository : Repository<Scope>;

    constructor(ctx: ScopeProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
    }

    async synchronize(input: ScopeProvisioningContainer): Promise<ScopeProvisioningContainer> {
        const data = await this.repository.save(input.data);

        return {
            ...input,
            data,
        };
    }
}
