/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientTokenExchangeRealmScope } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
import { pickRecord } from '@authup/kit';
import type { IClientTokenExchangeCapabilityRepository } from '../../../entities/index.ts';
import type { ClientTokenExchangeCapabilityProvisioningEntity } from '../../entities/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { ClientTokenExchangeCapabilityProvisioningSynchronizerContext } from './types.ts';

export class ClientTokenExchangeCapabilityProvisioningSynchronizer
    extends BaseProvisioningSynchronizer<ClientTokenExchangeCapabilityProvisioningEntity> {
    protected repository: IClientTokenExchangeCapabilityRepository;

    constructor(ctx: ClientTokenExchangeCapabilityProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
    }

    /**
     * A file may declare a row partially, for an `absent` or a `merge`, but a
     * row written whole needs its value and lifetime. Checked here rather than
     * per file because the composite source folds several files into one entry.
     */
    protected assertComplete(attributes: ClientTokenExchangeCapabilityProvisioningEntity['attributes']): void {
        if (!attributes.value || !attributes.maxAge) {
            throw new AuthupError(`The token exchange capability for audience '${attributes.audience}' needs a value and a maxAge.`);
        }
    }

    async synchronize(
        input: ClientTokenExchangeCapabilityProvisioningEntity,
    ): Promise<ClientTokenExchangeCapabilityProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.repository.findOneBy({
            clientId: input.attributes.clientId,
            audience: input.attributes.audience,
        });

        // A case-insensitive collation answers a lookup that differs in case;
        // the audience is case-sensitive by contract, so that row is not this
        // declaration's to change. The insert then fails on the unique key.
        if (attributes && attributes.audience !== input.attributes.audience) {
            attributes = null;
        }

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.repository.remove(attributes);
            }

            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

        // A merge changes what the file names, while a created or replaced
        // row is the whole declaration, so it takes the default scope.
        const declared = {
            realmScope: ClientTokenExchangeRealmScope.OWN,
            ...input.attributes,
        };

        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.repository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.repository.save(attributes);

                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    this.assertComplete(declared);
                    attributes = await this.repository.save(this.repository.create({ ...declared, id: attributes.id }));

                    break;
            }
        } else {
            this.assertComplete(declared);
            attributes = await this.repository.save(this.repository.create(declared));
        }

        return {
            ...input,
            attributes,
        };
    }
}
