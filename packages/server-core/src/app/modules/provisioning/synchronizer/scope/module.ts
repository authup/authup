/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import type { ScopeProvisioningData } from '../../entities/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { ScopeProvisioningSynchronizerContext } from './types.ts';

export class ScopeProvisioningSynchronizer extends BaseProvisioningSynchronizer<ScopeProvisioningData> {
    protected repository : Repository<Scope>;

    constructor(ctx: ScopeProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
    }

    async synchronize(input: ScopeProvisioningData): Promise<ScopeProvisioningData> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || IsNull(),
        });
        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.clientRepository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.repository.save(input.attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    await this.clientRepository.remove(attributes);
                    attributes = await this.clientRepository.save(input.attributes);
                    break;
            }
        } else {
            attributes = await this.clientRepository.save(input.attributes);
        }

        return {
            ...input,
            attributes,
        };
    }
}
