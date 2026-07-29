/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type IndexRename = {
    table: string,
    from: string,
    to: string
};

export type ForeignKeyRename = {
    table: string,
    column: string,
    from: string,
    to: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete: string,
    onUpdate: string
};

export type ColumnTypeChange = {
    table: string,
    column: string,
    nullable: boolean,
    from: string,
    to: string
};
