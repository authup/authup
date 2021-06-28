export interface AbstractPermission<T extends {}> {
    id: number | string,
    negation?: boolean,
    conditions?: Conditions<T>,
    fields?: (keyof T)[],
    power?: number
}

// Allow String in case of Date, to allow options like: TIME_NOW - 3600
type AllowedValue<T> = T extends Date ? (T | string) : T;

export type Conditions<T extends {}> = {
    [K in keyof T]?:
        T[K] extends Record<string, any> ?
            (T[K] extends Date ? (ConditionInstruction<T[K]> | AllowedValue<T[K]>) : Conditions<T[K]>) :
            (ConditionInstruction<T[K]> | AllowedValue<T[K]>)
}

export type ConditionInstruction<V> = {
    [I in Instruction]?: InstructionValue<I, V>
}

type InstructionValue<I, V> =
    I extends ArrayInstruction ?
        V[] :
        (
            I extends InstructionOnInstruction ?
                ConditionInstruction<V> :
                (
                    I extends BooleanInstruction ?
                        boolean :
                        AllowedValue<V>)
            );

type ArrayInstruction =
    '$in' |
    '$nin' |
    '$all';
type BooleanInstruction =
    '$exists';

type InstructionOnInstruction =
    '$elemMatch';

export type Instruction =
    '$eq' |
    '$ne' |
    '$lt' |
    '$lte' |
    '$gt' |
    '$gte' |
    ArrayInstruction |
    '$size' |
    '$regex' |
    InstructionOnInstruction |
    BooleanInstruction;

/*
interface User {
    id: number,
    name: string,
    createdAt: Date,
    auto: {
        id: number,
        name: string
    }
}

const userPermission : AbstractPermission<User> = {
    id: 1,
    conditions: {
        id: {
            $lt: 1,
            $gt: 5
        },
        createdAt: {
            $exists: false
        },
        auto: {
            id: 1,
            name: {
                $in: ["name"]
            }
        }
    }
}
*/
