import {camelCase} from 'change-case';
import {AbilityKeys, transformIDToAbilityKeys} from "../permission/utils";

const prettifyName = (name: string) => {
    let action: string, subject: string;

    let parts = name.split('_');
    action = parts.pop();
    subject = parts.join('_');

    let text = action+'_'+subject;
    text = text.replace(/_/g, ' ');

    return camelCase(text);
}

/**
 * Transform name and scope of a db permission object to an ability.
 *
 * @param name
 * @param jsonScope
 *
 * @return AuthAbility
 */
const transformScopeToAbility = (name: string, jsonScope: string) : AuthAbility => {
    let parsedJson = JSON.parse(jsonScope);

    const abilityRepresentation : AbilityKeys = transformIDToAbilityKeys(name);

    let ability: AuthAbility = {
        action: abilityRepresentation.action,
        subject: abilityRepresentation.subject,
        condition: {},
        fields: null
    };

    /**
     * {
     *     stars: [
     *         {key: '$lte', value: 10},
     *         {key: '$gte', value: 1}
     *     ],
     *     status: {
     *         key: '$in',
     *         value: ['success']
     *     }
     * }
     */

    if(parsedJson) {
        if(typeof parsedJson === 'object') {
            for(let attribute in parsedJson) {
                if(!parsedJson.hasOwnProperty(attribute)) {
                    continue;
                }

                if(Array.isArray(parsedJson[attribute])) {
                    ability.condition[attribute] = {};
                    for(let i=0; i<parsedJson[attribute].length; i++) {
                        if(typeof parsedJson[attribute][i] === 'object') {
                            let {key, value} = parsedJson[attribute][i];
                            ability.condition[attribute] = unserializeScopeCondition(key, value);
                        } else {
                            ability.condition[attribute] = parsedJson[attribute];
                        }
                    }
                } else if(typeof parsedJson[attribute] === 'object') {
                    let { key, value } = parsedJson[attribute];
                    ability.condition[attribute] = unserializeScopeCondition(key, value);
                } else {
                    ability.condition[attribute] = parsedJson[attribute];
                }
            }
        }
    }

    return ability;
};

/**
 * Unserialize db serialized MongoDB query language for ability conditions.
 *
 * @param key
 * @param value
 *
 * @return object | null
 */
const unserializeScopeCondition = (key: string, value: any) : object | null => {
    switch(key) {
        case '$eq':
            return {$eq: value}
        case '$ne':
            return {$ne: value}
        case '$gt':
            return {$gt: value}
        case '$gte':
            return {$gte: value}
        case '$in':
            return {$in: value}
        case '$nin':
            return {$nin: value}
        case '$all':
            return {$all: value}
        case '$size':
            return {$size: value}
        case '$regex':
            return {$regex: value}
        case '$exists':
            return {$exists: value}
        case '$elemMatch':
            return {$elemMatch: value}
        case '$lte':
            return {$lte: value}
    }

    return null;
};


//---------------------------------------------

type AuthAbility = {
    action: string,
    subject: string,
    condition: any,
    fields: any
}

//---------------------------------------------

export default {
    transformScopeToAbility,
    transformScopeCondition: unserializeScopeCondition,
    prettifyName
};

export {
    AuthAbility,
    transformScopeToAbility,
    unserializeScopeCondition,
    prettifyName
}
