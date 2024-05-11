/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Ability } from '@authup/kit';
import type { PermissionRelation } from './entity';

function isStringArray(input: unknown): input is string[] {
    if (!Array.isArray(input)) {
        return false;
    }

    const items = input.map((item) => typeof item === 'string');

    return items.length === input.length;
}

function buildAbilityFields(input: string | null): string[] | undefined {
    if (!input) {
        return undefined;
    }

    const data = JSON.parse(input);
    if (!isStringArray(data) || data.length === 0) {
        return undefined;
    }

    return data;
}

// todo: replace CURRENT_DATE with evaluation of Date.now()
export function buildAbility(entity: PermissionRelation): Ability {
    if (typeof entity.permission === 'undefined') {
        throw new SyntaxError('The permission relation attribute is mandatory.');
    }

    return {
        name: entity.permission.name,
        condition: entity.condition,
        power: entity.power,
        fields: buildAbilityFields(entity.fields),
        inverse: entity.negation,
        target: entity.target,
        realmId: entity.permission.realm_id,
    };
}
