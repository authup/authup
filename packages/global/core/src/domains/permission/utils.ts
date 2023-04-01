/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';
import type { PermissionRelation } from './types';
import type { AbilityDescriptor } from '../../ability-manager';

export function buildPermissionMetaCondition(input: string | null): MongoQuery {
    if (typeof input === 'undefined') {
        return {};
    }

    // todo: verify object shape

    return JSON.parse(input);
}

export function buildPermissionMetaFields(input: string | null): string[] | undefined {
    if (!input) {
        return undefined;
    }

    const data = JSON.parse(input);
    if (!isFieldsArray(data) || data.length === 0) {
        return undefined;
    }

    return data;
}

function isFieldsArray(input: unknown): input is string[] {
    if (!Array.isArray(input)) {
        return false;
    }

    const items = input.map((item) => typeof input === 'string');

    return items.length === input.length;
}

// todo: replace CURRENT_DATE with evaluation of Date.now()

export function buildPermissionDescriptorFromRelation(entity: PermissionRelation): AbilityDescriptor {
    if (typeof entity.permission === 'undefined') {
        throw new Error('The permission relation is mandatory.');
    }

    return {
        name: entity.permission.name,
        condition: buildPermissionMetaCondition(entity.condition),
        power: entity.power,
        fields: buildPermissionMetaFields(entity.fields),
        inverse: entity.negation,
        target: entity.target,
    };
}
