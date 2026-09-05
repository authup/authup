/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { Ask } from '../../src/types.ts';
import { collectAnswers } from '../../src/prompts.ts';

// Answers are consumed in order; '' takes the prompt's fallback, the way readline's empty line does.
function createScriptedAsk(script: string[]): { ask: Ask, questions: string[] } {
    const questions: string[] = [];
    const ask: Ask = async (question, fallback) => {
        questions.push(question);
        const answer = script.shift();
        if (answer === undefined) {
            throw new Error(`No scripted answer left for: ${question}`);
        }

        return answer === '' ? (fallback ?? '') : answer;
    };

    return { ask, questions };
}

function countAsked(questions: string[], text: string): number {
    return questions.filter((question) => question.includes(text)).length;
}

const URL = 'https://auth.example.com';

// target, url, database, bundled, db password, registration, recovery, admin password, worker, console, redis
const COMPOSE_DEFAULTS = ['', URL, '', '', 'db-secret', '', '', 'admin-secret', '', '', ''];

describe('collectAnswers', () => {
    it('should produce a bundled postgres with no smtp on the compose default flow', async () => {
        const { ask, questions } = createScriptedAsk([...COMPOSE_DEFAULTS]);

        const { answers, notes } = await collectAnswers(ask);

        expect(questions).toHaveLength(11);
        expect(notes).toEqual([]);
        expect(answers).toEqual({
            target: 'compose',
            publicUrl: URL,
            db: {
                type: 'postgres',
                bundled: true,
                host: 'postgres',
                port: 5432,
                username: 'authup',
                password: 'db-secret',
                database: 'authup',
            },
            redis: false,
            smtp: false,
            registrationEnabled: false,
            passwordRecoveryEnabled: false,
            adminPassword: 'admin-secret',
            workerSplit: false,
            consoleSplit: false,
        });
    });

    it('should refuse start123 and the empty string as admin password', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(7, 1, 'start123', '', 'real-secret');
        const { ask, questions } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.adminPassword).toEqual('real-secret');
        expect(countAsked(questions, 'Admin password')).toEqual(3);
        expect(countAsked(questions, 'start123 is the provisioning default')).toEqual(1);
    });

    it('should re-ask an invalid public url', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(1, 1, 'not a url', 'ftp://auth.example.com', URL);
        const { ask, questions } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.publicUrl).toEqual(URL);
        expect(countAsked(questions, 'Public URL')).toEqual(3);
    });

    it('should not offer sqlite for compose', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(2, 1, '3', 'sqlite', '');
        const { ask, questions } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.db.type).toEqual('postgres');
        expect(countAsked(questions, 'Database (')).toEqual(3);
        expect(questions.find((question) => question.includes('Database ('))).not.toContain('sqlite');
    });

    it('should offer sqlite for bare-metal and ask neither bundling nor the splits', async () => {
        // target, url, database, registration, recovery, admin password, redis, redis url
        const { ask, questions } = createScriptedAsk(['bare-metal', URL, 'sqlite', '', '', 'admin-secret', 'y', '']);

        const { answers, notes } = await collectAnswers(ask);

        expect(questions).toHaveLength(8);
        expect(notes).toEqual([]);
        expect(answers.db).toEqual({ type: 'better-sqlite3' });
        expect(answers.redis).toEqual({ url: 'redis://127.0.0.1:6379' });
        expect(answers.workerSplit).toBeFalsy();
        expect(answers.consoleSplit).toBeFalsy();
        expect(countAsked(questions, 'alongside')).toEqual(0);
        expect(countAsked(questions, 'separate service')).toEqual(0);
    });

    it('should force redis on for a worker split and say why', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(8, 3, 'y', '');
        const { ask, questions } = createScriptedAsk(script);

        const { answers, notes } = await collectAnswers(ask);

        expect(answers.workerSplit).toEqual(true);
        expect(answers.consoleSplit).toEqual(false);
        expect(answers.redis).toEqual({ url: 'redis://redis:6379' });
        expect(notes).toEqual(['Redis is required for a split deployment: the console sign-in and the token blocklist ride the cache.']);
        expect(countAsked(questions, 'redis')).toEqual(0);
    });

    it('should never ask the split questions for docker and take the external database from the prompts', async () => {
        // target, url, database, host, port (invalid, then valid), username, password, name, registration, recovery, admin, redis
        const { ask, questions } = createScriptedAsk([
            'docker', 
            URL, 
            'mysql', 
            'db.internal', 
            '70000', 
            '3307', 
            '', 
            'db-secret', 
            '', 
            '', 
            '', 
            'admin-secret', 
            '',
        ]);

        const { answers } = await collectAnswers(ask);

        expect(answers.target).toEqual('docker');
        expect(answers.db).toEqual({
            type: 'mysql',
            bundled: false,
            host: 'db.internal',
            port: 3307,
            username: 'authup',
            password: 'db-secret',
            database: 'authup',
        });
        expect(answers.redis).toEqual(false);
        expect(answers.workerSplit).toEqual(false);
        expect(answers.consoleSplit).toEqual(false);
        expect(countAsked(questions, 'Database port')).toEqual(2);
        expect(countAsked(questions, 'alongside')).toEqual(0);
        expect(countAsked(questions, 'separate service')).toEqual(0);
    });

    it('should require an smtp url once registration is on and refuse an http one', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(5, 2, 'y', '', 'http://mail.example.com', 'smtp://u:p@mail:587');
        const { ask, questions } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.registrationEnabled).toEqual(true);
        expect(answers.smtp).toEqual({ url: 'smtp://u:p@mail:587' });
        expect(countAsked(questions, 'SMTP connection URL')).toEqual(2);
    });

    it('should refuse a public url carrying credentials, a query or, for helm, a path', async () => {
        // target, url (three refused, then accepted), database, bundled, db password, registration, recovery, admin, worker, console, redis
        const { ask, questions } = createScriptedAsk([
            'helm',
            'https://user:pw@auth.example.com',
            'https://auth.example.com/?x=1',
            'https://auth.example.com/auth',
            'https://auth.example.com',
            '', 
            '', 
            'db-secret', 
            '', 
            '', 
            'admin-secret', 
            '', 
            '', 
            '',
        ]);

        const { answers } = await collectAnswers(ask);

        expect(answers.publicUrl).toEqual('https://auth.example.com');
        expect(countAsked(questions, 'Public URL')).toEqual(4);
        expect(questions.filter((question) => question.includes('origin root'))).toHaveLength(1);
    });

    it('should accept a sub-path public url for compose', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script[1] = 'https://example.com/auth';
        const { ask } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.publicUrl).toEqual('https://example.com/auth');
    });

    it('should bound the admin password to the registry limits and keep its whitespace', async () => {
        const script = [...COMPOSE_DEFAULTS];
        script.splice(7, 1, 'ab', 'a'.repeat(257), 'it\'s "both"', ' spaced secret ');
        const { ask, questions } = createScriptedAsk(script);

        const { answers } = await collectAnswers(ask);

        expect(answers.adminPassword).toEqual(' spaced secret ');
        expect(countAsked(questions, 'Admin password')).toEqual(4);
    });

    it('should require a database host for a container target instead of prefilling the loopback', async () => {
        // target, url, database, host (blank refused, then given), port, username, password, name, registration, recovery, admin, redis
        const { ask, questions } = createScriptedAsk([
            'docker', 
            URL, 
            'postgres', 
            '', 
            'db.internal', 
            '', 
            '', 
            'db-secret', 
            '', 
            '', 
            '', 
            'admin-secret', 
            '',
        ]);

        const { answers } = await collectAnswers(ask);

        expect(answers.db).toMatchObject({ host: 'db.internal', port: 5432 });
        expect(countAsked(questions, 'Database host')).toEqual(2);
        expect(questions.find((question) => question.includes('Database host'))).toContain('container itself');
    });
});
