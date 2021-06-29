import {OwnedPermission} from "../permission";

export type OwnedAbility<T extends {}> = {
    action: string,
    subject: string
} & OwnedPermission<T>;

// -------------------------------------------------------------------

// Allow String in case of Date, to allow options like: TIME_NOW - 3600
type AllowedValue<T> = T extends Date ? (T | string) : T;

export type Condition<T extends {}> = {
    [K in keyof T]?:
        T[K] extends Record<string, any> ?
            (T[K] extends Date ? (ConditionInstruction<T[K]> | AllowedValue<T[K]>) : Condition<T[K]>) :
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
