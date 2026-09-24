/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { RecordNamed } from '../../src/composables/record';
import { buildRecordHeading } from '../../src/composables/record';

const ID = '4f0f6f2c-4a0b-4f4a-9a3f-4b7d4b4a1f11';

const localizeName = (entity: RecordNamed) => (entity.name === 'client_create' && entity.builtIn ?
    'Create clients' :
    entity.name || '');

describe('buildRecordHeading', () => {
    it('should lead with the localized name and push the raw name into the sub title', () => {
        expect(buildRecordHeading({
            id: ID, 
            name: 'client_create', 
            builtIn: true, 
        }, localizeName)).toEqual({
            label: 'Create clients',
            subTitle: 'client_create',
        });
    });

    it('should fall through to the id for a name without a label', () => {
        expect(buildRecordHeading({ id: ID, name: 'reports_export' }, localizeName)).toEqual({
            label: 'reports_export',
            subTitle: ID,
        });
    });

    it('should keep the display name ahead of the localized name', () => {
        expect(buildRecordHeading({
            id: ID,
            name: 'client_create',
            displayName: 'Onboard apps',
            builtIn: true,
        }, localizeName)).toEqual({
            label: 'Onboard apps',
            subTitle: 'client_create',
        });
    });
});
