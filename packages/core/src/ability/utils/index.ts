import { camelCase } from 'change-case';

export type AbilityKeys = {
    action: string,
    subject: string
}

export function createAbilityKeysFromPermissionID(name: string, delimiter: string = '_') : AbilityKeys {
    const parts : string[] = name.split(delimiter);
    const action : string | undefined = parts.pop();
    const subject : string = camelCase(parts.join(delimiter));

    if(typeof action === 'undefined') {
        throw new Error('The ability keys cannot be created by the permission name.');
    }

    return {
        action,
        subject
    }
}
