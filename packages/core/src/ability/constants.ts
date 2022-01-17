/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ArrayInstruction {
    IN = '$in',
    NOT_IN = '$nin',
    ALL = '$all',
}

export enum BooleanInstruction {
    EXISTS = '$exists',
}

export enum InstructionOnInstruction {
    ELEMENT_MATCH = '$elemMatch',
}

export enum BaseInstruction {
    EQUAL = '$eq',
    NOT_EQUAL = '$ne',
    LESS_THAN = '$lt',
    LESS_THAN_EQUAL = '$lte',
    GREATER_THAN = '$gt',
    GREATER_THAN_EQUAL = '$gte',
    SIZE = '$size',
    REGEX = '$regex',
}
