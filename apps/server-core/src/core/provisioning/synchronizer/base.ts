/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IProvisioningSynchronizer, ProvisioningSynchronizeContext } from '../types.ts';

export abstract class BaseProvisioningSynchronizer<T> implements IProvisioningSynchronizer<T> {
    // Sequential to avoid race conditions on concurrent upserts.
    // Can be switched to Promise.all() if callers guarantee unique inputs.
    async synchronizeMany(input: T[], context?: ProvisioningSynchronizeContext): Promise<T[]> {
        const output: T[] = [];

        for (const entity of input) {
            output.push(await this.synchronize(entity, context));
        }

        return output;
    }

    abstract synchronize(input: T, context?: ProvisioningSynchronizeContext): Promise<T>;

    /**
     * Bind relations now, or once every entity of the context's set exists.
     */
    protected async bind(task: () => Promise<void>, context?: ProvisioningSynchronizeContext): Promise<void> {
        if (context) {
            context.defer(task);

            return;
        }

        await task();
    }

    // canonical identifier form: provisioning sources may carry raw names.
    // The file source validates (and canonicalizes) with the PROVISIONING
    // group, but the default source and programmatic sources bypass that
    // validation entirely — defense in depth for lookups against canonically
    // stored rows and canonical persistence.
    protected canonicalizeName(attributes: { name?: string | null } | undefined): void {
        if (attributes && typeof attributes.name === 'string') {
            attributes.name = attributes.name.trim().toLowerCase();
        }
    }
}
