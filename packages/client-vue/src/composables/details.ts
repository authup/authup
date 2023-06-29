/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ref } from 'vue';
import type { MaybeRef, Ref } from 'vue';
import { extendObjectProperties } from '../core';

type ID = string | number;
type Entity = {
    [key: string]: any,
    id: ID
};

type Context<T extends Entity> = {
    id?: MaybeRef<ID>,
    entity?: MaybeRef<T>,
    get(id: ID) : Promise<T>,
    update(id: ID, data: Partial<T>) : Promise<Partial<T>>,
    delete(id: ID) : Promise<any>,
    onUpdated(entity: Partial<T>) : any,
    onDeleted(entity: T) : any,
    onFailed(e: Error) : any
};

type Details<T extends Entity> = {
    busy: Ref<boolean>,
    entity: Ref<T | undefined>,
    lockId: Ref<ID | undefined>,
    update(entity: Partial<T>) : Promise<void>,
    updated(entity: T) : void,
    delete() : Promise<void>,
    deleted(entity?: T) : void;
    failed(e: Error) : void;
    load() : Promise<void>;
};
export function createDomainDetails<T extends Entity>(ctx: Context<T>) : Details<T> {
    const lockId = ref<ID | undefined>(undefined);
    let entity : Ref<T | undefined> = ref(undefined);
    let error : Error | undefined;

    const load = async () => {
        const idRef = ref(ctx.id);
        const entityRef = ref(ctx.entity);

        if (typeof idRef.value !== 'undefined') {
            try {
                entity.value = await ctx.get(idRef.value);
            } catch (e) {
                if (e instanceof Error) {
                    error = e;
                }
            }
        }

        if (typeof entityRef.value !== 'undefined') {
            // eslint-disable-next-line vue/no-ref-as-operand
            entity = entityRef as Ref<T>;
        }

        if (typeof entity.value === 'undefined') {
            if (!error) {
                throw new Error('Entity could not be determined.');
            }

            throw error;
        }
    };

    const updated = (value: Partial<T>) => {
        if (entity.value) {
            extendObjectProperties(entity.value, value);
        }

        ctx.onUpdated(entity.value || value);
    };
    const deleted = (value: T) => ctx.onDeleted(value || entity.value);

    const failed = (error: Error) => ctx.onFailed(error);

    const busy = ref(false);

    const update = async (data: Partial<T>) => {
        if (busy.value || !entity.value) {
            return;
        }

        busy.value = true;
        lockId.value = entity.value.id;

        try {
            const response = await ctx.update(
                entity.value.id,
                data,
            );

            updated(response);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            busy.value = false;
            lockId.value = undefined;
        }
    };

    const remove = async () => {
        if (busy.value || !entity.value) {
            return;
        }

        busy.value = true;
        lockId.value = entity.value.id;

        try {
            const response = await ctx.delete(
                entity.value.id,
            );

            deleted(response);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            busy.value = false;
            lockId.value = undefined;
        }
    };

    return {
        load,
        lockId,
        busy,
        entity,

        update,
        updated,

        delete: remove,
        deleted,

        failed,
    };
}
