/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TARGETS } from './constants.ts';
import type {
    Answers, 
    Ask, 
    Database, 
    Target,
} from './types.ts';

type Parsed<T> = { value: T } | { error: string };

const ENGINE_PORTS = { postgres: 5432, mysql: 3306 } as const;
const BUNDLED_REDIS_URL = 'redis://redis:6379';
const REDIS_NOTE = 'Redis is required for a split deployment: the console sign-in and the token blocklist ride the cache.';

// A refused answer re-asks with the reason on the line above, so the flow stays pure over `ask`.
async function askUntil<T>(ask: Ask, question: string, fallback: string | undefined, parse: (answer: string) => Parsed<T>): Promise<T> {
    let prefix = '';

    for (;;) {
        const parsed = parse(await ask(prefix + question, fallback));
        if ('value' in parsed) {
            return parsed.value;
        }

        prefix = `${parsed.error}\n`;
    }
}

function askChoice<T extends string>(ask: Ask, question: string, options: readonly T[], fallback: T): Promise<T> {
    const listed = options.map((option, index) => `${index + 1}: ${option}`).join(', ');

    return askUntil<T>(ask, `${question} (${listed})`, fallback, (answer) => {
        const normalized = answer.trim().toLowerCase();
        if ((options as readonly string[]).includes(normalized)) {
            return { value: normalized as T };
        }

        const numbered = options[Number(normalized) - 1];
        if (numbered !== undefined) {
            return { value: numbered };
        }

        return { error: `Pick one of ${options.join(', ')}, by name or number.` };
    });
}

function askYesNo(ask: Ask, question: string, fallback: boolean): Promise<boolean> {
    return askUntil<boolean>(ask, `${question} (y/n)`, fallback ? 'y' : 'n', (answer) => {
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'y' || normalized === 'yes') {
            return { value: true };
        }
        if (normalized === 'n' || normalized === 'no') {
            return { value: false };
        }

        return { error: 'Answer y or n.' };
    });
}

function askUrl(ask: Ask, question: string, protocols: readonly string[] = ['http:', 'https:'], fallback?: string): Promise<string> {
    return askUntil<string>(ask, question, fallback, (answer) => {
        const trimmed = answer.trim();
        try {
            if (protocols.includes(new URL(trimmed).protocol)) {
                return { value: trimmed };
            }
        } catch {
            // falls through to the refusal
        }

        return { error: `Enter an absolute URL using ${protocols.map((protocol) => `${protocol}//`).join(' or ')}.` };
    });
}

// A free-text answer that must not be blank; trimmed, unlike a secret.
function askText(ask: Ask, question: string, fallback?: string): Promise<string> {
    return askUntil<string>(ask, question, fallback, (answer) => {
        const trimmed = answer.trim();

        return trimmed === '' ? { error: 'A value is required.' } : { value: trimmed };
    });
}

// The issuer: no credentials, query or fragment (OIDC Core 3.1.2.1), and for the helm target no path either, since
// the chart publishes authup at the origin root and refuses a console split under a sub-path.
function askPublicUrl(ask: Ask, target: Target): Promise<string> {
    return askUntil<string>(
        ask,
        'Public URL: the address a browser reaches authup at. It is the OIDC issuer, and every console url derives from it',
        undefined,
        (answer) => {
            const trimmed = answer.trim();
            let url: URL;
            try {
                url = new URL(trimmed);
            } catch {
                return { error: 'Enter an absolute URL using http:// or https://.' };
            }

            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return { error: 'Enter an absolute URL using http:// or https://.' };
            }
            if (url.username || url.password || url.search || url.hash) {
                return { error: 'The public URL is the OIDC issuer: no credentials, query or fragment.' };
            }
            if (target === 'helm' && url.pathname !== '/') {
                return { error: 'The helm chart publishes authup at the origin root: enter the URL without a path.' };
            }

            return { value: trimmed };
        },
    );
}

function askPort(ask: Ask, question: string, fallback: number): Promise<number> {
    return askUntil<number>(ask, question, String(fallback), (answer) => {
        const port = Number(answer.trim());
        if (Number.isSafeInteger(port) && port >= 1 && port <= 65535) {
            return { value: port };
        }

        return { error: 'Enter a port between 1 and 65535.' };
    });
}

function askSecret(ask: Ask, question: string): Promise<string> {
    return askUntil<string>(ask, question, undefined, (answer) => {
        if (answer.trim() === '') {
            return { error: 'A value is required.' };
        }
        if (answer === 'start123') {
            return { error: 'start123 is the provisioning default the wizard refuses to emit. Choose another value.' };
        }
        // the bounds the config registry declares for userAdminPassword
        if (answer.length < 3 || answer.length > 256) {
            return { error: 'Use between 3 and 256 characters.' };
        }
        if (answer.includes('\'') && answer.includes('"')) {
            return { error: 'Use one kind of quote at most: a value carrying both cannot be written to a .env file.' };
        }

        return { value: answer };
    });
}

async function askDatabase(ask: Ask, target: Target): Promise<Database> {
    const options: readonly ('postgres' | 'mysql' | 'sqlite')[] = target === 'bare-metal' ?
        ['postgres', 'mysql', 'sqlite'] :
        ['postgres', 'mysql'];
    const type = await askChoice(ask, 'Database', options, 'postgres');
    if (type === 'sqlite') {
        return { type: 'better-sqlite3' };
    }

    const bundled = (target === 'compose' || target === 'helm') &&
        await askYesNo(ask, 'Run the database alongside authup?', true);
    if (bundled) {
        return {
            type,
            bundled: true,
            host: type,
            port: ENGINE_PORTS[type],
            username: 'authup',
            password: await askSecret(ask, 'Database password'),
            database: 'authup',
        };
    }

    // 127.0.0.1 is the operator's machine on bare metal and the container itself everywhere else
    const hostQuestion = target === 'bare-metal' ?
        'Database host' :
        'Database host (a name the container resolves; 127.0.0.1 would be the container itself)';

    return {
        type,
        bundled: false,
        host: await askText(ask, hostQuestion, target === 'bare-metal' ? '127.0.0.1' : undefined),
        port: await askPort(ask, 'Database port', ENGINE_PORTS[type]),
        username: await askText(ask, 'Database username', 'authup'),
        password: await askSecret(ask, 'Database password'),
        database: await askText(ask, 'Database name', 'authup'),
    };
}

export async function collectAnswers(ask: Ask): Promise<{ answers: Answers, notes: string[] }> {
    const target = await askChoice(ask, 'Deployment target', TARGETS, 'compose');
    const publicUrl = await askPublicUrl(ask, target);
    const db = await askDatabase(ask, target);

    const registrationEnabled = await askYesNo(ask, 'Enable user registration?', false);
    const passwordRecoveryEnabled = await askYesNo(ask, 'Enable password recovery?', false);
    const smtp = registrationEnabled || passwordRecoveryEnabled ?
        { url: await askUrl(ask, 'SMTP connection URL (smtp(s)://user:pass@host:port)', ['smtp:', 'smtps:']) } :
        false;

    const adminPassword = await askSecret(ask, 'Admin password');

    const splittable = target === 'compose' || target === 'helm';
    const workerSplit = splittable && await askYesNo(ask, 'Run the background worker as a separate service?', false);
    const consoleSplit = splittable && await askYesNo(ask, 'Run the consoles as a separate service?', false);

    const notes: string[] = [];
    let redis: Answers['redis'] = false;
    if (workerSplit || consoleSplit) {
        redis = { url: BUNDLED_REDIS_URL };
        notes.push(REDIS_NOTE);
    } else if (await askYesNo(ask, 'Use redis?', false)) {
        redis = {
            url: splittable ?
                BUNDLED_REDIS_URL :
                await askUrl(
                    ask,
                    target === 'bare-metal' ? 'Redis URL' : 'Redis URL (a host the container resolves)',
                    ['redis:', 'rediss:'],
                    target === 'bare-metal' ? 'redis://127.0.0.1:6379' : undefined,
                ),
        };
    }

    return {
        answers: {
            target,
            publicUrl,
            db,
            redis,
            smtp,
            registrationEnabled,
            passwordRecoveryEnabled,
            adminPassword,
            workerSplit,
            consoleSplit,
        },
        notes,
    };
}
