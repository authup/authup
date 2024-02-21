import type { PermissionRelation } from '../../../domains';
import type { Ability } from '../type';

function buildPermissionMetaFields(input: string | null): string[] | undefined {
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

    const items = input.map((item) => typeof item === 'string');

    return items.length === input.length;
}

// todo: replace CURRENT_DATE with evaluation of Date.now()

export function buildAbilityDescriptor(entity: PermissionRelation): Ability {
    if (typeof entity.permission === 'undefined') {
        throw new Error('The permission relation attribute is mandatory.');
    }

    return {
        name: entity.permission.name,
        condition: entity.condition,
        power: entity.power,
        fields: buildPermissionMetaFields(entity.fields),
        inverse: entity.negation,
        target: entity.target,
    };
}
