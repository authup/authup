/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveCLIConsoleSelection } from '../../../src/cli/commands/console';

/**
 * The positionals of `authup-server console [admin|account ...]` are sugar
 * over the two console flags: a named console is forced on, every unnamed
 * one off, and no name leaves both as configured.
 */
describe('src/cli/commands/console', () => {
    it('should leave both consoles as configured without a selector', () => {
        expect(resolveCLIConsoleSelection([])).toEqual({});
    });

    it('should force the admin console on and the account console off', () => {
        expect(resolveCLIConsoleSelection(['admin'])).toEqual({
            adminConsoleEnabled: true,
            accountConsoleEnabled: false,
        });
    });

    it('should force the account console on and the admin console off', () => {
        expect(resolveCLIConsoleSelection(['account'])).toEqual({
            adminConsoleEnabled: false,
            accountConsoleEnabled: true,
        });
    });

    it('should force both consoles on when both are named', () => {
        expect(resolveCLIConsoleSelection(['admin', 'account'])).toEqual({
            adminConsoleEnabled: true,
            accountConsoleEnabled: true,
        });

        expect(resolveCLIConsoleSelection(['account', 'admin', 'admin'])).toEqual({
            adminConsoleEnabled: true,
            accountConsoleEnabled: true,
        });
    });

    it('should refuse the auth console, naming the reason', () => {
        expect(() => resolveCLIConsoleSelection(['auth']))
            .toThrow(/"auth" is not a console selector.*every role/);

        // refused even next to a valid selector: the process must not start
        expect(() => resolveCLIConsoleSelection(['admin', 'auth']))
            .toThrow(/"auth" is not a console selector/);
    });

    it('should refuse an unknown console', () => {
        expect(() => resolveCLIConsoleSelection(['bogus']))
            .toThrow('Unknown console "bogus". Expected one of: admin, account.');
    });
});
