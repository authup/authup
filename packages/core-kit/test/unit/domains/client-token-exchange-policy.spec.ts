/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { ClientTokenExchangePolicyValidator, ClientTokenExchangeSubjectRealmScope } from '../../../src';

const ID = '6f4b5e0a-7f7b-4d43-9b0e-0a2f7a7a0001';

function buildInput(data: Record<string, unknown> = {}) {
    return {
        clientId: ID,
        audience: 'storage',
        capabilityTypes: 'bucket bucket-file',
        maxLifetime: 3600,
        ...data,
    };
}

describe('ClientTokenExchangePolicyValidator', () => {
    const validator = new ClientTokenExchangePolicyValidator();

    const create = (data: Record<string, unknown>) => validator.run(data, { group: ValidatorGroup.CREATE });
    const update = (data: Record<string, unknown>) => validator.run(data, { group: ValidatorGroup.UPDATE });

    it('should accept a complete create and leave the scope to the caller', async () => {
        const input = buildInput();
        const output = await create(input);

        expect(output).toEqual(input);
    });

    it.each([
        ['clientId'],
        ['audience'],
        ['capabilityTypes'],
        ['maxLifetime'],
    ])('should require %s on create', async (key) => {
        const input = buildInput();

        delete input[key as keyof typeof input];

        await expect(create(input)).rejects.toThrow();
    });

    it('should accept each subject realm scope and refuse any other', async () => {
        for (const scope of Object.values(ClientTokenExchangeSubjectRealmScope)) {
            const output = await create(buildInput({ subjectRealmScope: scope }));

            expect(output.subjectRealmScope).toEqual(scope);
        }

        await expect(create(buildInput({ subjectRealmScope: 'ownOrNull' }))).rejects.toThrow();
        await expect(create(buildInput({ subjectRealmScope: null }))).rejects.toThrow();
    });

    it('should never take a realm from the input', async () => {
        const output = await create(buildInput({ realmId: ID }));

        expect(output).not.toHaveProperty('realmId');
    });

    it('should accept a partial update and drop the client', async () => {
        const output = await update({
            maxLifetime: 60, 
            clientId: ID, 
            realmId: ID, 
        });

        expect(output).toEqual({ maxLifetime: 60 });
    });

    describe('audience', () => {
        it('should trim but keep the case, since an audience is not an identifier', async () => {
            const output = await create(buildInput({ audience: '  Storage.Example  ' }));

            expect(output.audience).toEqual('Storage.Example');
        });

        it('should accept the full length', async () => {
            const audience = 'a'.repeat(256);
            const output = await create(buildInput({ audience }));

            expect(output.audience).toEqual(audience);
        });

        it.each([
            ['empty', ''],
            ['blank', ' '.repeat(3)],
            ['inner whitespace', 'stor age'],
            ['a tab', 'stor\tage'],
            ['a NUL byte', 'stor\0age'],
            ['a control character', 'stor\x01age'],
            ['too long', 'a'.repeat(257)],
            ['not a string', 42],
        ])('should reject %s', async (_label, audience) => {
            await expect(create(buildInput({ audience }))).rejects.toThrow();
        });
    });

    describe('capabilityTypes', () => {
        it('should normalize the separators', async () => {
            const output = await create(buildInput({ capabilityTypes: '  bucket \t  bucket-file\nanalysis ' }));

            expect(output.capabilityTypes).toEqual('bucket bucket-file analysis');
        });

        it('should accept a single type at the maximum segment length', async () => {
            const type = `a${'b'.repeat(63)}`;
            const output = await create(buildInput({ capabilityTypes: type }));

            expect(output.capabilityTypes).toEqual(type);
        });

        it.each([
            ['empty', ''],
            ['blank', ' '.repeat(3)],
            ['an uppercase type', 'Bucket'],
            ['a leading digit', '1bucket'],
            ['a leading dash', '-bucket'],
            ['a colon', 'bucket:read'],
            ['a comma list', 'bucket,file'],
            ['a duplicate', 'bucket file bucket'],
            ['a segment too long', `a${'b'.repeat(64)}`],
            ['a list too long', 'a'.repeat(4097)],
            ['not a string', ['bucket']],
        ])('should reject %s', async (_label, capabilityTypes) => {
            await expect(create(buildInput({ capabilityTypes }))).rejects.toThrow();
        });
    });

    describe('maxLifetime', () => {
        it.each([[1], [86400]])('should accept %d', async (maxLifetime) => {
            const output = await create(buildInput({ maxLifetime }));

            expect(output.maxLifetime).toEqual(maxLifetime);
        });

        it.each([
            [0],
            [-1],
            [86401],
            [1.5],
            ['3600'],
            [null],
        ])('should reject %s', async (maxLifetime) => {
            await expect(create(buildInput({ maxLifetime }))).rejects.toThrow();
        });
    });
});
