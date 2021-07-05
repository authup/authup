import {EntitySchemaColumnOptions} from "typeorm";
import {Condition} from "@typescript-auth/core";

export interface PermissionRelationInterface {
    power: number;

    condition: Condition<any>;

    fields: string[];

    negation: boolean;

    created_at: string;

    updated_at: string;
}

export const PermissionRelationColumns : Record<string, EntitySchemaColumnOptions> = {
    power: {
        type: "int",
        default: 999,
        unsigned: true
    },
    condition: {
        type: "json",
        nullable: true,
        default: null
    },
    fields: {
        type: "json",
        nullable: true,
        default: null
    },
    negation: {
        type: "boolean",
        default: false
    },
    created_at: {
        createDate: true,
        type: "timestamp"
    },
    updated_at: {
        updateDate: true,
        type: "timestamp"
    }
}
