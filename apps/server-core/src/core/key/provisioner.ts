/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { JWKUse } from '@authup/specs';
import type { IKeyProvisioner, IKeyStore } from './types.ts';

export type KeyProvisionerContext = {
    keyStore: IKeyStore,
    logger?: Logger,
};

/**
 * Eagerly mints a realm's sig + enc keys (plan 071 hybrid model): run at
 * realm creation and as a startup backfill, so keys are visible in the
 * management API from the moment a realm exists instead of appearing on
 * first use. resolveOrCreate stays as the zero-rows self-healing backstop.
 */
export class KeyProvisioner implements IKeyProvisioner {
    protected keyStore: IKeyStore;

    protected logger?: Logger;

    constructor(ctx: KeyProvisionerContext) {
        this.keyStore = ctx.keyStore;
        this.logger = ctx.logger;
    }

    async ensureForRealm(realm: Realm | { id: string }): Promise<void> {
        const uses : `${JWKUse}`[] = [JWKUse.SIGNATURE, JWKUse.ENCRYPTION];

        for (const use of uses) {
            try {
                await this.keyStore.resolveOrCreate(realm.id, use);
            } catch (e) {
                // rows-exist-but-none-active throws by design (a deliberate
                // admin kill switch) — the provisioning guarantee is only
                // "at least one row exists", so log and continue.
                if (this.logger) {
                    this.logger.warn(
                        `Failed to provision ${use} key for realm ${realm.id}: ${e instanceof Error ? e.message : String(e)}`,
                    );
                }
            }
        }
    }
}
