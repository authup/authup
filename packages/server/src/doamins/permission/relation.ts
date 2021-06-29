import {Column, CreateDateColumn, UpdateDateColumn} from "typeorm";
import {Condition} from "../../permission/type";

export abstract class PermissionRelation {
    @Column({type: 'int', default: 999})
    power: number;

    @Column({type: 'json', nullable: true, default: null})
    condition: Condition<any>;

    @Column({type: 'json', nullable: true, default: null})
    fields: string[];

    @Column({type: "boolean", default: false})
    negation: boolean;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string;
}
