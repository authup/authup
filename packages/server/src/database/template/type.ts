import {EntityOptions, EntitySchemaColumnOptions} from "typeorm";

export type TemplateEntityProperty = {
    key: string,
    type: string
}

export type TemplateEntityOptions = EntityOptions;

export type TemplateEntityColumn = {
    options: EntitySchemaColumnOptions,
} & TemplateEntityProperty;

export type TemplateEntityRelations = {
    decorator: string,
    target: string,
    inverseSide?: string,
    options?: string
} & TemplateEntityProperty;

export type TemplateEntity = {
    imports: {
        value: string | string[],
        path: string
    }[],

    entityOptions: TemplateEntityOptions,
    entityName: string,

    columns: TemplateEntityColumn[],
    relations: TemplateEntityRelations[]
}

export type TransformedTemplateData = {
    imports: {
        value: string,
        path: string
    }[],

    entityOptions: string,
    entityName: string,

    columns: TemplateEntityColumn[],
    relations: TemplateEntityRelations[]
}
