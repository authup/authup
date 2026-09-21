/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createURLCodec } from '@rapiq/codec-url';
import type { IQuery } from '@rapiq/core';
import type { EntityQueryArgs } from './types.ts';

const codec = createURLCodec();

function readPageNumber(name: string, value: string | undefined) : string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!/^\d+$/.test(value)) {
        throw new Error(`--${name} must be a non-negative integer.`);
    }

    return value;
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

    const limit = readPageNumber('limit', args.limit);
    if (limit !== undefined) {
        params.set('page[limit]', limit);
    }

    const offset = readPageNumber('offset', args.offset);
    if (offset !== undefined) {
        params.set('page[offset]', offset);
    }

    if (params.size === 0) {
        return undefined;
    }

    return codec.decode(params.toString()) ?? undefined;
}
