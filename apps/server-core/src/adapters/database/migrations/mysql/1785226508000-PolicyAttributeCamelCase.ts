/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
    POLICY_ATTRIBUTE_KEY_RENAMES,
    camelizePropertyPath,
    snakizePropertyPath,
    transformAttributeNameValue,
    transformNamesValue,
    transformQueryValue,
} from '../helpers/policy-attribute-camel-case.ts';

/**
 * Rename an EA key on auth_policy_attributes. The unique (name, policy_id)
 * index means a rename can collide with an already-present target row; the
 * source duplicate is removed first to keep the update constraint-safe
 * (same dance as 1784289540000-CamelCaseAttributes).
 */
async function renameAttributeKey(
    queryRunner: QueryRunner,
    from: string,
    to: string,
): Promise<void> {
    await queryRunner.query(
        'DELETE `source` FROM `auth_policy_attributes` AS `source` ' +
        'INNER JOIN `auth_policy_attributes` AS `target` ' +
        'ON `source`.`policy_id` = `target`.`policy_id` ' +
        'AND `source`.`name` = ? AND `target`.`name` = ?',
        [from, to],
    );

    await queryRunner.query(
        'UPDATE `auth_policy_attributes` SET `name` = ? WHERE `name` = ?',
        [to, from],
    );
}

async function transformAttributeValues(
    queryRunner: QueryRunner,
    attributeName: string,
    policyType: string,
    transform: (value: string) => string | null,
): Promise<void> {
    const rows: { id: string, value: string }[] = await queryRunner.query(
        'SELECT `a`.`id` AS `id`, `a`.`value` AS `value` ' +
        'FROM `auth_policy_attributes` `a` ' +
        'INNER JOIN `auth_policies` `p` ON `p`.`id` = `a`.`policy_id` ' +
        'WHERE `a`.`name` = ? AND `p`.`type` = ? AND `a`.`value` IS NOT NULL',
        [attributeName, policyType],
    );

    for (const row of rows) {
        const next = transform(row.value);
        if (next === null) {
            continue;
        }

        await queryRunner.query(
            'UPDATE `auth_policy_attributes` SET `value` = ? WHERE `id` = ?',
            [next, row.id],
        );
    }
}

/**
 * Plan-073 residual (the shipped CamelCaseAttributes migration deliberately
 * skipped auth_policy_attributes on the assumption that only provisioner-
 * owned built-in policies existed — user-authored policies were left with
 * snake_case references that no longer match the camelCase attribute bags;
 * an `invert: true` policy over a never-matching key fails OPEN):
 *
 * 1. EA KEYS — the validator-defined snake_case config keys move to their
 *    camelCase mounts (attribute_name → attributeName, day_of_week →
 *    dayOfWeek, ...). Enumerated, never blanket-transformed.
 * 2. ATTRIBUTES `query` values — entity-property FIELD keys inside the
 *    mongo-style filter document (recursive; `$`-operator keys verbatim,
 *    their payloads recursed; dotted paths per segment; VALUES untouched).
 * 3. ATTRIBUTE_NAMES `names` values — the JSON array ENTRIES are entity
 *    property names.
 * 4. REALM_MATCH `attributeName` values — a property-name string (or array).
 *
 * `down()` is the mirrored snake transform: lossy for a natively-camel key
 * authored after the fact, like 1784289540000's down — revert works, it is
 * not information-preserving.
 */
export class PolicyAttributeCamelCase1785226508000 implements MigrationInterface {
    name = 'PolicyAttributeCamelCase1785226508000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [from, to] of POLICY_ATTRIBUTE_KEY_RENAMES) {
            await renameAttributeKey(queryRunner, from, to);
        }

        await transformAttributeValues(queryRunner, 'query', 'attributes', (value) => transformQueryValue(value, camelizePropertyPath));
        await transformAttributeValues(queryRunner, 'names', 'attributeNames', (value) => transformNamesValue(value, camelizePropertyPath));
        await transformAttributeValues(queryRunner, 'attributeName', 'realmMatch', (value) => transformAttributeNameValue(value, camelizePropertyPath));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await transformAttributeValues(queryRunner, 'attributeName', 'realmMatch', (value) => transformAttributeNameValue(value, snakizePropertyPath));
        await transformAttributeValues(queryRunner, 'names', 'attributeNames', (value) => transformNamesValue(value, snakizePropertyPath));
        await transformAttributeValues(queryRunner, 'query', 'attributes', (value) => transformQueryValue(value, snakizePropertyPath));

        for (const [from, to] of POLICY_ATTRIBUTE_KEY_RENAMES) {
            await renameAttributeKey(queryRunner, to, from);
        }
    }
}
