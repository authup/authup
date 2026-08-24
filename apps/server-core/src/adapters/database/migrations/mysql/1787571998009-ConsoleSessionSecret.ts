/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Plan 088 Stage 1: the console session credential.
 *
 * `auth_sessions.secret` is the opaque value a console browser presents in the
 * `authup_console_session` cookie. It is NOT the session id: that id is
 * published as the `sid` claim in every id_token and in every `/sessions` row,
 * so it is a public identifier and cannot double as a credential. This column
 * is the secret half.
 *
 * Nullable because every bearer-mode session has none, and unique so one value
 * resolves at most one session. The entity additionally marks it
 * `select: false`, so it is re-selected only by `findOneBySecret` and never on
 * an ordinary session read.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsoleSessionSecret1787571998009 implements MigrationInterface {
    name = 'ConsoleSessionSecret1787571998009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD \`secret\` varchar(64) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD UNIQUE INDEX \`IDX_833c743f7cd787dfc8b70ba400\` (\`secret\`)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP INDEX \`IDX_833c743f7cd787dfc8b70ba400\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`secret\`
        `);
    }
}
