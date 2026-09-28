/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { template } from '../../src';

describe('src/template', () => {
    it('should substitute a known key and leave an unknown one', () => {
        expect(template('{{a}}-{{b}}', { a: 'x' })).toEqual('x-{{b}}');
    });

    it('should insert a value verbatim, replacement patterns included', () => {
        expect(template('({{a}})', { a: '$&x$\'$`$$' })).toEqual('($&x$\'$`$$)');
    });
});
