/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { RESOURCE_METHODS, RESOURCE_NAMES } from './constants.ts';
import type { ResourceCommandArgs, ResourceOperation } from './types.ts';

export function validateResourceArguments(args: ResourceCommandArgs) : ResourceOperation {
    if (args._.length > 3) {
        throw new Error('Unexpected resource argument.');
    }

    if (!RESOURCE_NAMES.includes(args.resource)) {
        throw new Error(`Unknown resource. Choose ${RESOURCE_NAMES.join(', ')}.`);
    }

    if (!Object.hasOwn(RESOURCE_METHODS, args.operation)) {
        throw new Error('Unknown operation. Use list, get, create, update or delete.');
    }

    const operation = args.operation as ResourceOperation;
    const requiresId = operation === 'get' || operation === 'update' || operation === 'delete';

    if (requiresId && !args.id) {
        throw new Error('This operation requires a record ID.');
    }

    if (!requiresId && args.id) {
        throw new Error('This operation does not take a record ID.');
    }

    if (args.id && (args.id === '.' || args.id === '..' || /[\\/?#]/.test(args.id))) {
        throw new Error('Invalid record ID.');
    }

    const requiresData = operation === 'create' || operation === 'update';

    if (requiresData && args.data === undefined) {
        throw new Error('This operation requires --data.');
    }

    if (!requiresData && args.data !== undefined) {
        throw new Error('This operation does not accept --data.');
    }

    if (args.data !== undefined) {
        let data: unknown;
        try {
            data = JSON.parse(args.data);
        } catch {
            throw new Error('--data must be a JSON object.');
        }

        if (!isObject(data)) {
            throw new Error('--data must be a JSON object.');
        }
    }

    const supportsQuery = operation === 'list' || operation === 'get';
    if (!supportsQuery && args.query !== undefined) {
        throw new Error('--query is only supported for list/get.');
    }

    return operation;
}
