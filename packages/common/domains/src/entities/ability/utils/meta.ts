/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { camelCase } from 'change-case';
import { AbilityMeta } from '../type';
import { AbilityError } from '../../../error';

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
) : AbilityMeta {
    const parts : string[] = name.split(delimiter);
    if (parts.length < 2) {
        throw AbilityError.buildMeta();
    }

    const action : string | undefined = parts.pop();
    const subject : string = camelCase(parts.join(delimiter));

    return {
        action,
        subject,
    };
}
