/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { pascalCase } from 'change-case';
import { AbilityItemConfig, AbilityItemMeta } from '../type';
import { AbilityError } from '../../../error';
import { PermissionRelation } from '../../permission';
import { buildPermissionMetaCondition } from './condition';
import { buildPermissionMetaFields } from './fields';

/**
 * Build ability-meta object from permission name.
 *
 * @param name
 * @param delimiter
 *
 * @throws AbilityError
 */
export function buildAbilityMetaFromName(
    name: string,
    delimiter = '_',
) : AbilityItemMeta {
    const parts : string[] = name.split(delimiter);
    if (parts.length < 2) {
        throw AbilityError.buildMeta();
    }

    const action : string = parts.pop();
    const subject : string = pascalCase(parts.join(' '));

    return {
        action,
        subject,
    };
}

export function buildNameFromAbilityMeta(meta: AbilityItemMeta) : string {
    return `${meta.subject}_${meta.subject}`;
}

export function buildPermissionMetaFromRelation(entity: PermissionRelation) : AbilityItemConfig {
    return {
        id: entity.permission_id,
        condition: buildPermissionMetaCondition(entity.condition),
        power: entity.power,
        fields: buildPermissionMetaFields(entity.fields),
        negation: entity.negation,
        target: entity.target,
    };
}
