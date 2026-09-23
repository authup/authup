/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { StatsGranularity } from '@authup/core-http-kit';
import type { EntityStatsQuery } from '@authup/core-http-kit';
import { createURLCodec } from '@rapiq/codec-url';
import type { IQuery } from '@rapiq/core';
import type { EntityQueryArgs, EntityStatsArgs } from './types.ts';

const codec = createURLCodec();

const GRANULARITIES = Object.values(StatsGranularity) as string[];

function readInteger(name: string, value: string | undefined) : string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!/^\d+$/.test(value)) {
        throw new Error(`--${name} must be a non-negative integer.`);
    }

    return value;
}

function isStatsGranularity(value: string) : value is `${StatsGranularity}` {
    return GRANULARITIES.includes(value);
}

/**
 * The flags are the URL parameters the server documents, so the value
 * syntax is the API query language and the codec is the same one the
 * server decodes with.
 */
export function readEntityQuery(args: EntityQueryArgs) : IQuery | undefined {
    const params = new URLSearchParams();

    const conditions = (args.filter ?? '').split('&').filter((part) => part.length > 0);
    for (const condition of conditions) {
        const index = condition.indexOf('=');
        if (index <= 0) {
            throw new Error(`Invalid --filter condition "${condition}": expected <key>=<expression>.`);
        }

        params.append(`filter[${condition.slice(0, index)}]`, condition.slice(index + 1));
    }

    if (args.sort) {
        params.set('sort', args.sort);
    }

    if (args.fields) {
        params.set('fields', args.fields);
    }

    if (args.include) {
        params.set('include', args.include);
    }

    const limit = readInteger('limit', args.limit);
    if (limit !== undefined) {
        params.set('page[limit]', limit);
    }

    const offset = readInteger('offset', args.offset);
    if (offset !== undefined) {
        params.set('page[offset]', offset);
    }

    if (params.size === 0) {
        return undefined;
    }

    return codec.decode(params.toString()) ?? undefined;
}

/**
 * The filter is decoded like a list read's; the window and the bucket
 * width travel as plain parameters next to it.
 */
export function readEntityStatsQuery<
    T extends Record<string, any> = Record<string, any>,
>(args: EntityStatsArgs) : EntityStatsQuery<T> {
    const query : EntityStatsQuery<T> = {};

    const filters = readEntityQuery({ filter: args.filter })?.filters;
    if (filters) {
        query.filters = filters;
    }

    if (args.granularity !== undefined) {
        if (!isStatsGranularity(args.granularity)) {
            throw new Error(`--granularity must be one of ${GRANULARITIES.join(', ')}.`);
        }

        query.granularity = args.granularity;
    }

    const days = readInteger('days', args.days);
    if (days !== undefined) {
        query.days = Number(days);
    }

    return query;
}
