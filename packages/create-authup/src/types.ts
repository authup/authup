/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/** The deployment shape the wizard writes files for. */
export type Target = 'docker' | 'compose' | 'helm' | 'bare-metal';

/** The database the deployment talks to; sqlite carries no connection. */
export type Database = { type: 'better-sqlite3' } | {
    type: 'postgres' | 'mysql',
    bundled: boolean,
    host: string,
    port: number,
    username: string,
    password: string,
    database: string
};

/** Everything the prompt flow collects; on compose and helm the redis url is the bundled service's. */
export type Answers = {
    target: Target,
    publicUrl: string,
    db: Database,
    redis: false | { url: string },
    smtp: false | { url: string },
    registrationEnabled: boolean,
    passwordRecoveryEnabled: boolean,
    adminPassword: string,
    workerSplit: boolean,
    consoleSplit: boolean
};

/** File name onto file content. */
export type Rendered = Record<string, string>;

/** One target's pure render: answers plus the package version onto the files it writes. */
export type Renderer = (answers: Answers, version: string) => Rendered;

/** One question to the operator; an empty answer yields the fallback when one is given. */
export type Ask = (question: string, fallback?: string) => Promise<string>;
