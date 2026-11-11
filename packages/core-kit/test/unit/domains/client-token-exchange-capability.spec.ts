/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { ClientTokenExchangeCapabilityValidator, ClientTokenExchangeRealmScope } from '../../../src';

const ID = '6f4b5e0a-7f7b-4d43-9b0e-0a2f7a7a0001';

function buildInput(data: Record<string, unknown> = {}) {
    return {
        clientId: ID,
        audience: 'storage',
        value: 'bucket bucket-file',
        maxAge: 3600,
        ...data,
    };
}

describe('ClientTokenExchangeCapabilityValidator', () => {
    const validator = new ClientTokenExchangeCapabilityValidator();

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
        ['value'],
        ['maxAge'],
    ])('should require %s on create', async (key) => {
        const input = buildInput();

        delete input[key as keyof typeof input];

        await expect(create(input)).rejects.toThrow();
    });

    it('should accept each subject realm scope and refuse any other', async () => {
        for (const scope of Object.values(ClientTokenExchangeRealmScope)) {
            const output = await create(buildInput({ realmScope: scope }));

            expect(output.realmScope).toEqual(scope);
        }

        await expect(create(buildInput({ realmScope: 'ownOrNull' }))).rejects.toThrow();
        await expect(create(buildInput({ realmScope: null }))).rejects.toThrow();
    });

    it('should never take a realm from the input', async () => {
        const output = await create(buildInput({ realmId: ID }));

        expect(output).not.toHaveProperty('realmId');
    });

    it('should accept a partial update and drop the client', async () => {
        const output = await update({
            maxAge: 60, 
            clientId: ID, 
            realmId: ID, 
        });

        expect(output).toEqual({ maxAge: 60 });
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

    describe('value', () => {
        it('should normalize the separators', async () => {
            const output = await create(buildInput({ value: '  bucket \t  bucket-file\nanalysis ' }));

            expect(output.value).toEqual('bucket bucket-file analysis');
        });

        it('should accept bare types and type:action entries together', async () => {
            const output = await create(buildInput({ value: 'bucket:read bucket:write bucket-file' }));

            expect(output.value).toEqual('bucket:read bucket:write bucket-file');
        });

        it('should accept camelCase types', async () => {
            const output = await create(buildInput({ value: 'bucket bucketFile:read' }));

            expect(output.value).toEqual('bucket bucketFile:read');
        });

        it('should accept a single type at the maximum segment length', async () => {
            const type = `a${'b'.repeat(63)}`;
            const output = await create(buildInput({ value: type }));

            expect(output.value).toEqual(type);
        });

        it.each([
            ['empty', ''],
            ['blank', ' '.repeat(3)],
            ['a type starting with an uppercase letter', 'Bucket'],
            ['a leading digit', '1bucket'],
            ['a leading dash', '-bucket'],
            ['an empty action', 'bucket:'],
            ['an empty type', ':read'],
            ['an uppercase action', 'bucket:Read'],
            ['a comma action list', 'bucket:read,write'],
            ['a third segment', 'bucket:read:write'],
            ['a duplicate action', 'bucket:read bucket:read'],
            ['a bare type next to one of its actions', 'bucket bucket:read'],
            ['an action too long', `bucket:a${'b'.repeat(32)}`],
            ['a comma list', 'bucket,file'],
            ['a duplicate', 'bucket file bucket'],
            ['a segment too long', `a${'b'.repeat(64)}`],
            ['a list too long', Array.from({ length: 80 }, (_, index) => `t${index}:read`).join(' ')],
            ['not a string', ['bucket']],
        ])('should reject %s', async (_label, value) => {
            await expect(create(buildInput({ value }))).rejects.toThrow();
        });
    });

    describe('maxAge', () => {
        it.each([[1], [86400]])('should accept %d', async (maxAge) => {
            const output = await create(buildInput({ maxAge }));

            expect(output.maxAge).toEqual(maxAge);
        });

        it.each([
            [0],
            [-1],
            [86401],
            [1.5],
            ['3600'],
            [null],
        ])('should reject %s', async (maxAge) => {
            await expect(create(buildInput({ maxAge }))).rejects.toThrow();
        });
    });
});
