/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { camelCase } from 'change-case';

export type AbilityKeys = {
    action: string,
    subject: string
}

export function createAbilityKeysFromPermissionID(name: string, delimiter: string = '_') : AbilityKeys {
    const parts : string[] = name.split(delimiter);
    if(parts.length < 2) {
        throw new Error('The ability keys cannot be created by the permission name.');
    }

    const action : string | undefined = parts.pop();
    const subject : string = camelCase(parts.join(delimiter));

    return {
        action,
        subject
    }
}
