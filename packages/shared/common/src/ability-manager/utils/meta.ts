/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { pascalCase } from 'change-case';
import { AbilityID } from '../type';
import { AbilityError } from '../../error';

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
) : AbilityID {
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

export function buildNameFromAbilityID(meta: AbilityID) : string {
    return `${meta.subject}_${meta.subject}`;
}
