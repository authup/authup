/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import mysql from 'mysql2';
import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';

/**
 * `timestamp without time zone`, the type of every `created_at` /
 * `updated_at` column on postgres.
 */
const POSTGRES_TIMESTAMP_OID = 1114;

/**
 * pg's own parser for `timestamp with time zone`, which honours an explicit
 * zone marker and still handles `infinity` and BC dates.
 */
const parseZonedTimestamp = pg.types.getTypeParser(1184);

const MYSQL_SESSION_TIMEZONE_SQL = 'SET time_zone = \'+00:00\'';

/**
 * Read a zone-less postgres timestamp as UTC. The text form is
 * `YYYY-MM-DD HH:MM:SS[.ffffff][ BC]`, so the marker goes right after the
 * time part; `infinity` has no space and passes through unchanged.
 */
export function parsePostgresTimestampAsUTC(value: string) : Date | number | null {
    return parseZonedTimestamp(value.replace(/^(\S+ \S+)/, '$1Z'));
}

type MysqlPool = ReturnType<typeof mysql.createPool>;
type MysqlConnection = { query: (sql: string, callback: (err: unknown) => void) => unknown, destroy: () => void };

/**
 * The mysql2 module with every pool pinning its connections to UTC. The pool
 * emits `connection` synchronously, before it hands a new connection to the
 * caller, and a connection runs its queries in order, so the `SET` is the
 * first statement every connection executes. A connection whose `SET` fails
 * is destroyed rather than left to stamp in another zone.
 */
export function createUTCSessionMysqlDriver(base: typeof mysql = mysql) : typeof mysql {
    return {
        ...base,
        createPool(...args: Parameters<typeof mysql.createPool>) : MysqlPool {
            const pool = base.createPool(...args);
            pool.on('connection', (connection: MysqlConnection) => {
                connection.query(MYSQL_SESSION_TIMEZONE_SQL, (err) => {
                    if (err) {
                        connection.destroy();
                    }
                });
            });

            return pool;
        },
    } as typeof mysql;
}

/**
 * Stamp AND read the zone-less timestamp columns in UTC, whatever the
 * timezone of the database server or of the Node process (#3641).
 *
 * `created_at` / `updated_at` are stamped by the database (`now()`,
 * `CURRENT_TIMESTAMP(6)`) in its SESSION timezone, and both drivers read
 * them back in the PROCESS timezone. The two agree only when both clocks
 * are set alike, and everything else in authup (the query adapter binding
 * a filter operand, the login throttle, the event statistics buckets)
 * assumes UTC. Pinning only the read side would break an install whose
 * database runs in local time, where `auth_time` (read from a session's
 * `createdAt`) would land in the future and satisfy `max_age` for the
 * length of the offset. So the session is pinned too:
 *
 * - postgres: `-c TimeZone=UTC` as a startup option, and a pool type parser
 *   that reads OID 1114 as UTC.
 * - mysql: `timezone: 'Z'` for mysql2, and `SET time_zone = '+00:00'` on
 *   every pooled connection. A replication (pool cluster) setup has no
 *   per-connection hook, so it is left as configured.
 *
 * Anything the operator set explicitly wins and turns the respective half
 * off: a mysql `timezone` or `driver`, a postgres `TimeZone` in
 * `extra.options`, or postgres `extra.types`.
 */
export function applyUTCTimestamps(options: DataSourceOptions) : DataSourceOptions {
    if (options.type === 'mysql') {
        if (
            typeof options.timezone !== 'undefined' ||
            typeof options.driver !== 'undefined' ||
            typeof options.replication !== 'undefined'
        ) {
            return options;
        }

        return {
            ...options,
            timezone: 'Z',
            driver: createUTCSessionMysqlDriver(),
        };
    }

    if (options.type === 'postgres') {
        const extra: Record<string, any> = { ...(options.extra ?? {}) };

        const startup = typeof extra.options === 'string' ? extra.options : '';
        if (!/timezone/i.test(startup)) {
            extra.options = `${startup} -c TimeZone=UTC`.trim();
        }

        if (typeof extra.types === 'undefined') {
            extra.types = {
                getTypeParser(oid: number, format?: 'text' | 'binary') {
                    if (oid === POSTGRES_TIMESTAMP_OID && format !== 'binary') {
                        return parsePostgresTimestampAsUTC;
                    }

                    return pg.types.getTypeParser(oid, format);
                },
            };
        }

        return { ...options, extra };
    }

    return options;
}
