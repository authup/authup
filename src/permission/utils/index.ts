import { camelCase } from 'change-case';

export type AbilityKeys = {
    action: string,
    subject: string
}

export function transformIDToAbilityKeys(name: string, delimiter: string = '_') : AbilityKeys {
    let parts : string[] = name.split(delimiter);
    let action : string | undefined = parts.pop();
    let subject : string = camelCase(parts.join(delimiter));

    if(typeof action === 'undefined') {
        throw new Error('Permission name not valid.');
    }

    return {
        action,
        subject
    }
}
