/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { IEntityRepository } from '../../entities/index.ts';

export type ProvisioningJunctionSynchronizerContext<T extends ObjectLiteral = ObjectLiteral> = {
    repository: IEntityRepository<T>,
    ownerKey: string,
    ownerRealmKey: string,
};

export class ProvisioningJunctionSynchronizer<T extends ObjectLiteral = ObjectLiteral> {
    protected ctx: ProvisioningJunctionSynchronizerContext<T>;

    constructor(ctx: ProvisioningJunctionSynchronizerContext<T>) {
        this.ctx = ctx;
    }

    async synchronize(
        owner: { id: string, realm_id?: string | null },
        targets: Array<{ id: string, realm_id?: string | null }>,
        targetKey: string,
        targetRealmKey: string,
    ): Promise<void> {
        for (const target of targets) {

            const existing = await this.ctx.repository.findOneBy({
                [this.ctx.ownerKey]: owner.id,
                [targetKey]: target.id,
            });

            if (!existing) {
                const entity = this.ctx.repository.create({
                    [this.ctx.ownerKey]: owner.id,
                    [this.ctx.ownerRealmKey]: owner.realm_id,
                    [targetKey]: target.id,
                    [targetRealmKey]: target.realm_id,
                } as Partial<T>);

                await this.ctx.repository.save(entity);
            }
        }
    }
}
