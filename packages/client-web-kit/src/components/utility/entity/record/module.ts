/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickEntityAPI } from '@authup/core-http-kit';
import type { EntityTypeMap } from '@authup/core-kit';
import type { ObjectLiteral } from '@authup/kit';
import { extendObject, hasOwnProperty } from '@authup/kit';
import type {
    FieldsBuildInput,
    FiltersBuildInput,
    ICondition,
    IQuery,
    ObjectLiteral as RapiqObjectLiteral,
} from '@rapiq/core';
import {
    Query,
    defineFields,
    defineFilters,
    definePagination,
} from '@rapiq/core';
import { defineDataRecord } from '@vuecs/data';
import type { DataRecordLoadResult } from '@vuecs/data';
import { normalizeQueryInput } from '../../../../core/query';
import { isObject } from 'smob';
import type { Ref, VNodeChild } from 'vue';
import {
    computed,
    isRef,
    ref,
    toRef,
    watch,
} from 'vue';
import { hasNormalizedSlot, injectHTTPClient, normalizeSlot } from '../../../../core';
import type { EntitySocketManager, EntitySocketManagerCreateContext } from '../socket';
import { defineEntitySocketManager } from '../socket';
import { EntityRecordError } from './error';
import type {
    EntityID,
    EntityManager,
    EntityManagerCreateContext,
    ResourceManagerRenderFn,
    ResourceManagerResolveContext,
} from './types';
import { buildEntityVSlotProps } from './helpers';

type EntityRecordMeta = {
    /**
     * Whether the load that produced the current state reached a verdict
     * worth announcing as `resolved`. A failed by-id read with no query to
     * fall back on does not.
     */
    resolved: boolean,
};

function create<
    TYPE extends keyof EntityTypeMap,
    RECORD extends EntityTypeMap[TYPE] & ObjectLiteral,
>(
    ctx: EntityManagerCreateContext<TYPE, RECORD>,
) : EntityManager<RECORD> {
    const client = injectHTTPClient();
    const domainAPI = pickEntityAPI<TYPE, RECORD>(client, ctx.type);

    const error = ref<Error | undefined>(undefined);

    // The resolve context reaches the loader as the source's per-call input.
    // `ensure(input)` compares inputs by identity, so equal contexts are
    // handed over as the same object: a resolve repeating the context of the
    // load in flight coalesces onto it instead of superseding it.
    let lastInputKey : string | undefined;
    let lastInput : ResourceManagerResolveContext<RECORD> | undefined;
    const toInput = (rctx: ResourceManagerResolveContext<RECORD>) => {
        const key = JSON.stringify(rctx);
        if (key !== lastInputKey || !lastInput) {
            lastInputKey = key;
            lastInput = rctx;
        }

        return lastInput;
    };

    const buildQuery = (rctx: ResourceManagerResolveContext<RECORD>) : IQuery | undefined => {
        let query : IQuery | undefined;
        if (rctx.query) {
            query = normalizeQueryInput(rctx.query);
        }

        if (!ctx.props) {
            return query;
        }

        if (ctx.props.queryFilters) {
            const current = query || new Query();
            query = new Query({
                fields: current.fields,
                relations: current.relations,
                sorts: current.sorts,
                pagination: current.pagination,
                filters: defineFilters(
                    ctx.props.queryFilters as FiltersBuildInput | ICondition,
                ),
            });
        }

        if (ctx.props.queryFields) {
            const current = query || new Query();
            query = new Query({
                filters: current.filters,
                relations: current.relations,
                sorts: current.sorts,
                pagination: current.pagination,
                fields: defineFields(ctx.props.queryFields as FieldsBuildInput<RapiqObjectLiteral>),
            });
        }

        return query;
    };

    // Precedence: props.entity, then the id (props.entityId over the resolve
    // context's), then a single-row query built from the context plus
    // props.queryFilters / props.queryFields. Never throws: a failed read is
    // recorded on `error`, as it was before the source existed.
    const loadRecord = async (
        _meta: EntityRecordMeta,
        input?: ResourceManagerResolveContext<RECORD>,
    ) : Promise<DataRecordLoadResult<RECORD, EntityRecordMeta>> => {
        const rctx = input ?? {};

        if (ctx.props && ctx.props.entity) {
            return { data: ctx.props.entity, meta: { resolved: true } };
        }

        if (!domainAPI) {
            return { data: undefined, meta: { resolved: true } };
        }

        const query = buildQuery(rctx);
        const id = (ctx.props && ctx.props.entityId) ?
            ctx.props.entityId :
            rctx.id;

        if (id && domainAPI.getOne) {
            try {
                const response = await domainAPI.getOne(id, query);
                return { data: response.data, meta: { resolved: true } };
            } catch (e) {
                if (e instanceof Error) {
                    error.value = e;
                }
            }
        }

        if (query && domainAPI.getMany) {
            try {
                const response = await domainAPI.getMany(new Query({
                    fields: query.fields,
                    filters: query.filters,
                    relations: query.relations,
                    sorts: query.sorts,
                    pagination: definePagination({ limit: 1 }),
                }));

                return {
                    data: response.data.length === 1 ? response.data[0] : undefined,
                    meta: { resolved: true },
                };
            } catch (e) {
                if (e instanceof Error) {
                    error.value = e;
                }

                return { data: undefined, meta: { resolved: false } };
            }
        }

        return { data: undefined, meta: { resolved: false } };
    };

    const initialEntity = ctx.props && ctx.props.entity ?
        ctx.props.entity :
        undefined;

    // `deep` so an in-place write to the held record
    // (`manager.data.value.parentId = ...`) re-renders.
    const source = defineDataRecord<RECORD, EntityRecordMeta, ResourceManagerResolveContext<RECORD>>({
        load: loadRecord,
        initialMeta: { resolved: false },
        initialData: initialEntity,
        autoLoad: false,
        deep: true,
    });

    // Ten forms assign `manager.data.value = props.entity`, so the bridge is
    // writable: a record replaces the source's, `undefined` clears it. A
    // write applies now, even while a load is in flight: the load is
    // superseded, so its response cannot replace what was written, and a
    // read right after the write answers it.
    const entity = computed<RECORD | undefined>({
        get: () => source.data.value,
        set: (value) => {
            if (value) {
                source.set(value, { immediate: true });
            } else {
                source.clear({ immediate: true });
            }
        },
    });

    const entityId = computed<EntityID<RECORD> | undefined>(
        () => (
            entity.value ? entity.value.id as EntityID<RECORD> : undefined),
    );

    const realmId = computed<string | undefined>(
        () => {
            let realmId : string | undefined;

            if (ctx.realmId) {
                if (typeof ctx.realmId === 'function') {
                    return ctx.realmId(entity.value);
                }

                realmId = isRef(ctx.realmId) ? ctx.realmId.value : ctx.realmId;
            }

            if (!realmId && entity.value) {
                if (
                    hasOwnProperty(entity.value, 'realmId') &&
                    typeof entity.value.realmId === 'string'
                ) {
                    return entity.value.realmId;
                }
            }

            return realmId;
        },
    );

    const lockId = ref(undefined) as Ref<EntityID<RECORD> | undefined>;

    const created = (value: RECORD) => {
        // Adopt the created record as the managed entity, consistent with
        // updated()/deleted() and with create(). Without this an externally
        // performed create (APermissionPolicyBindingButton's create mode, a
        // socket-originated create) would notify but leave the manager's data
        // unset, so the consumer never leaves the "no record" state.
        entity.value = value;

        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('created', value);
        }

        if (ctx.onCreated) {
            ctx.onCreated(value);
        }
    };

    const deleted = (value: RECORD) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('deleted', (value || entity.value) as RECORD);
        }

        if (ctx.onDeleted) {
            ctx.onDeleted((value || entity.value) as RECORD);
        }
    };

    const notifyUpdated = (value: Partial<RECORD>) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('updated', value as RECORD);
        }

        if (ctx.onUpdated) {
            ctx.onUpdated(value);
        }
    };

    const updated = (value: Partial<RECORD>) => {
        // A partial update lands on a copy: the source holds its record
        // shallowly, so a write into the held object would reach no reader.
        // The emit carries the record this write produced, never a read of
        // the source, which still holds the previous one while a load is in
        // flight.
        const current = entity.value;
        if (!current) {
            notifyUpdated(value);
            return;
        }

        const next = extendObject({ ...current }, value) as RECORD;
        entity.value = next;
        notifyUpdated(next);
    };

    const resolved = (value?: RECORD) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('resolved', value);
        }

        if (ctx.onResolved) {
            ctx.onResolved(value);
        }
    };

    const failed = (error: Error) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('failed', error);
        }

        if (ctx.onFailed) {
            ctx.onFailed(error);
        }
    };

    // A write is guarded by its own flag rather than by the source's busy:
    // loads stay re-entrant, while a double submit must still not write twice.
    let writing = false;

    const write = async (
        id: EntityID<RECORD> | undefined,
        fn: () => Promise<void>,
    ) : Promise<void> => {
        writing = true;
        lockId.value = id;

        try {
            await source.mutate(fn);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            writing = false;
            lockId.value = undefined;
        }
    };

    const update = async (data: Partial<RECORD>) => {
        const id = entityId.value;
        const api = domainAPI?.update?.bind(domainAPI);
        if (!api || writing || !id) {
            return;
        }

        await write(id, async () => {
            const response = await api(id, data);
            entity.value = response.data;
            notifyUpdated(response.data);
        });
    };

    const remove = async () : Promise<void> => {
        const id = entityId.value;
        const api = domainAPI?.delete?.bind(domainAPI);
        if (!api || writing || !id) {
            return;
        }

        await write(id, async () => {
            const response = await api(id);
            entity.value = undefined;
            deleted(response.data);
        });
    };

    const create = async (data: Partial<RECORD>) : Promise<void> => {
        const api = domainAPI?.create?.bind(domainAPI);
        if (!api || writing) {
            return;
        }

        await write(undefined, async () => {
            const response = await api(data);
            created(response.data);
        });
    };

    const createOrUpdate = async (data: Partial<RECORD>) : Promise<void> => {
        if (entity.value) {
            await update(data);
        } else {
            await create(data);
        }
    };

    let socket : EntitySocketManager | undefined;

    if (
        typeof ctx.socket !== 'boolean' ||
        typeof ctx.socket === 'undefined' ||
        typeof ctx.socket === 'function' ||
        ctx.socket
    ) {
        let socketContext : EntitySocketManagerCreateContext<TYPE, RECORD> = { type: ctx.type };

        if (isObject(ctx.socket)) {
            socketContext = {
                ...socketContext,
                ...ctx.socket,
            };
        }

        socketContext.onCreated = created;
        socketContext.onUpdated = updated;
        socketContext.lockId = lockId;
        socketContext.realmId = realmId;
        socketContext.target = true;
        socketContext.targetId = entityId;

        socket = defineEntitySocketManager(socketContext);
    }

    const announce = (force = false) => {
        if (!force && !source.meta.resolved) {
            return;
        }

        if (socket && entity.value) {
            socket.mount();
        }

        resolved(entity.value);
    };

    if (ctx.props) {
        const propEntityRef = toRef(ctx.props, 'entity');
        const propsEntityId = computed(() => (propEntityRef.value ? propEntityRef.value.id : undefined));
        watch(propsEntityId, (val) => {
            entity.value = propEntityRef.value;

            if (val) {
                if (socket) {
                    socket.mount();
                }
            } else if (socket) {
                socket.unmount();
            }
        });
    }

    if (initialEntity) {
        if (socket) {
            socket.mount();
        }

        resolved(initialEntity);
    }

    let reloading : Promise<void> | undefined;

    const resolve = async (rctx: ResourceManagerResolveContext<RECORD> = {}) => {
        if (reloading) {
            await reloading;
            return;
        }

        if (entity.value) {
            return;
        }

        const outcome = await source.ensure(toInput(rctx));

        // A write landing while the read was in flight superseded it and
        // holds the record the read was asked for.
        announce(outcome.status === 'superseded' && !!entity.value);
    };

    const resolveOrFail = async (resolveContext: ResourceManagerResolveContext<RECORD> = {}) => {
        await resolve(resolveContext);

        if (typeof entity.value === 'undefined') {
            if (!error.value) {
                throw EntityRecordError.unresolvable();
            }

            throw error.value;
        }
    };

    if (ctx.query) {
        const queryFn = ctx.query;
        let initialized = false;

        watch(
            () => JSON.stringify(queryFn()),
            () => {
                if (!initialized) {
                    initialized = true;
                    return;
                }

                // A changed query supersedes whatever is loading, so this is
                // a load rather than ensure(), which would coalesce onto it.
                // The held record answers the previous query: it is cleared
                // before the reload starts, so nothing reads or deletes it
                // as the record of the new one.
                source.clear({ immediate: true });

                const promise = source.load(undefined, toInput({ query: queryFn() })).then(() => {
                    if (reloading !== promise) {
                        return;
                    }

                    reloading = undefined;
                    announce();
                });
                reloading = promise;
            },
            { immediate: true },
        );
    }

    const manager : EntityManager<RECORD> = {
        resolve,
        resolveOrFail,
        lockId,
        busy: source.busy,
        data: entity,
        error,

        create,
        createOrUpdate,
        created,

        update,
        updated,

        delete: remove,
        deleted,

        failed,

        render: () => undefined,
        renderError: () => undefined,
    };

    manager.render = (content?: VNodeChild | ResourceManagerRenderFn): VNodeChild => {
        if (!ctx.setup || !ctx.setup.slots) {
            return typeof content === 'function' ?
                content() :
                content;
        }

        if (hasNormalizedSlot('default', ctx.setup.slots)) {
            return normalizeSlot(
                'default',
                buildEntityVSlotProps(manager),
                ctx.setup.slots,
            );
        }

        return typeof content === 'function' ?
            content() :
            content;
    };

    manager.renderError = (error: unknown) : VNodeChild => {
        if (!ctx.setup || !ctx.setup.slots) {
            return undefined;
        }

        if (
            isObject(error) &&
            hasNormalizedSlot('error', ctx.setup.slots)
        ) {
            return normalizeSlot('error', error, ctx.setup.slots);
        }

        return undefined;
    };

    return manager;
}

export function defineEntityManager<
    TYPE extends keyof EntityTypeMap,
>(
    ctx: EntityManagerCreateContext<TYPE, EntityTypeMap[TYPE]>,
) : EntityManager<EntityTypeMap[TYPE]> {
    return create<TYPE, EntityTypeMap[TYPE]>(ctx);
}
