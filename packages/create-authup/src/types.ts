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
    /** verify addresses on registration; asked only while registration is on, since it needs the SMTP transport */
    emailVerificationEnabled: boolean,
    adminPassword: string,
    workerSplit: boolean,
    consoleSplit: boolean,
    /** helm only: request the ingress certificate from cert-manager instead of expecting a <hostname>-tls secret */
    tlsCertManager: boolean
};

/** File name onto file content. */
export type Rendered = Record<string, string>;

/** One target's pure render: answers plus the package version onto the files it writes. */
export type Renderer = (answers: Answers, version: string) => Rendered;

/** How a question is asked: a secret is not echoed while typed. */
export type AskOptions = { secret?: boolean };

/** One question to the operator; an empty answer yields the fallback when one is given. */
export type Ask = (question: string, fallback?: string, options?: AskOptions) => Promise<string>;

/** What the public url says about how the deployment is reached. */
export type Exposure = {
    /** a reverse proxy in front owns the port a browser dials */
    behindProxy: boolean,
    /** the port a container target publishes, or a bare-metal process listens on */
    hostPort: number
};

/** The streams `createReadlineAsk` drives; they are arguments so the terminal behaviour is testable. */
export type ReadlineAskContext = {
    input?: NodeJS.ReadableStream & { isTTY?: boolean },
    output?: NodeJS.WritableStream & { isTTY?: boolean }
};

/** What `createReadlineAsk` hands back: the prompt function and the way to release the streams. */
export type ReadlineAskResult = { ask: Ask, close(): void };
