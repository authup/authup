/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PassThrough, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createReadlineAsk } from '../../src/ask.ts';

// A terminal readline will drive: it echoes what it reads back through the output, which is what muting suppresses.
function createTerminal() {
    const input = new PassThrough() as PassThrough & { isTTY?: boolean };
    input.isTTY = true;

    const written: string[] = [];
    const output = new Writable({
        write(chunk, _encoding, callback) {
            written.push(chunk.toString());
            callback();
        },
    }) as Writable & { isTTY?: boolean };
    output.isTTY = true;

    return {
        input,
        output,
        seen: () => written.join(''),
    };
}

describe('createReadlineAsk', () => {
    it('should keep a secret off the screen and echo an ordinary answer', async () => {
        const terminal = createTerminal();
        const { ask, close } = createReadlineAsk(terminal);

        const secret = ask('Admin password', undefined, { secret: true });
        terminal.input.write('hunter2\n');
        expect(await secret).toEqual('hunter2');
        expect(terminal.seen()).toContain('Admin password: ');
        expect(terminal.seen()).not.toContain('hunter2');

        const plain = ask('Database name', 'authup');
        terminal.input.write('inventory\n');
        expect(await plain).toEqual('inventory');
        expect(terminal.seen()).toContain('inventory');

        close();
    });

    it('should take every line of one chunk, the way a piped script arrives', async () => {
        const terminal = createTerminal();
        const { ask, close } = createReadlineAsk(terminal);

        terminal.input.write('first\nsecond\n');

        expect(await ask('One')).toEqual('first');
        expect(await ask('Two')).toEqual('second');

        close();
    });

    it('should answer an empty line with the fallback and keep whitespace otherwise', async () => {
        const terminal = createTerminal();
        const { ask, close } = createReadlineAsk(terminal);

        terminal.input.write('\n');
        expect(await ask('Database host', '127.0.0.1')).toEqual('127.0.0.1');

        terminal.input.write(' spaced secret \n');
        expect(await ask('Admin password', undefined, { secret: true })).toEqual(' spaced secret ');

        close();
    });

    it('should reject a question left open when the input ends', async () => {
        const terminal = createTerminal();
        const { ask } = createReadlineAsk(terminal);

        const pending = ask('Public URL');
        terminal.input.end();

        await expect(pending).rejects.toThrow('Input ended before every question was answered.');
    });
});
