import {Condition} from "../ability";

export type OwnedPermission<T extends {}> = {
    id: string,
    negation?: boolean,
    condition?: Condition<T> | null,
    fields?: string[] | null,
    power?: number | null
}
