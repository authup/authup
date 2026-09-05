/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import type { Ask } from './types.ts';

type PendingLine = {
    resolve: (line: string) => void,
    reject: (error: Error) => void
};

const CLOSED_MESSAGE = 'Input ended before every question was answered.';

export function createReadlineAsk(): { ask: Ask, close(): void } {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    // readline emits every line of one stdin chunk synchronously, while the next question is only registered on a
    // later microtask, so `rl.question` drops all but the first answer of a piped script. The lines are buffered
    // instead, and a close with a question still open is an error rather than the silent exit 0 node answers with.
    const lines: string[] = [];
    let pending: PendingLine | undefined;
    let closed = false;

    rl.on('line', (line) => {
        if (pending) {
            const { resolve } = pending;
            pending = undefined;
            resolve(line);
            return;
        }

        lines.push(line);
    });

    rl.on('close', () => {
        closed = true;
        if (pending) {
            const { reject } = pending;
            pending = undefined;
            reject(new Error(CLOSED_MESSAGE));
        }
    });

    // Ctrl+C on a TTY reaches readline rather than the process; without this it closes the interface and reads as EOF.
    rl.on('SIGINT', () => process.exit(130));

    function readLine(): Promise<{ line: string, buffered: boolean }> {
        const buffered = lines.shift();
        if (buffered !== undefined) {
            return Promise.resolve({ line: buffered, buffered: true });
        }

        if (closed) {
            return Promise.reject(new Error(CLOSED_MESSAGE));
        }

        return new Promise((resolve, reject) => {
            pending = { resolve: (line) => resolve({ line, buffered: false }), reject };
        });
    }

    return {
        // The answer is handed over untrimmed: a secret keeps its whitespace, and each parser trims what it should.
        ask: async (question, fallback) => {
            rl.setPrompt(fallback === undefined ? `${question}: ` : `${question} [${fallback}]: `);
            rl.prompt();
            const { line, buffered } = await readLine();
            if (buffered && process.stdout.isTTY) {
                // a type-ahead answer never echoed after this prompt, so the next prompt would overwrite the line
                process.stdout.write(`${line}\n`);
            }

            return fallback !== undefined && line.trim() === '' ? fallback : line;
        },
        close: () => rl.close(),
    };
}
