/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NamingStrategyInterface } from 'typeorm';
import { DefaultNamingStrategy } from 'typeorm';

function snakeCase(input: string) : string {
    return input.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    override columnName(
        propertyName: string,
        customName: string | undefined,
        embeddedPrefixes: string[],
    ): string {
        const name = customName || snakeCase(propertyName);

        if (embeddedPrefixes.length > 0) {
            return `${snakeCase(embeddedPrefixes.join('_'))}_${name}`;
        }

        return name;
    }

    override joinColumnName(relationName: string, referencedColumnName: string): string {
        return snakeCase(`${relationName}_${referencedColumnName}`);
    }

    override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return snakeCase(`${tableName}_${columnName || propertyName}`);
    }
}
