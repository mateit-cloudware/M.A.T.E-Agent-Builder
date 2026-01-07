import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration: Add UserAPIKey table for BYOK (Bring Your Own Key)
 * 
 * Stores user's own LLM API keys encrypted with AES-256-GCM
 */
export class AddUserAPIKey1748550000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS user_api_key (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                provider varchar(50) NOT NULL DEFAULT 'openrouter',
                "encryptedKey" text NOT NULL,
                iv text NOT NULL,
                "keyHash" varchar(64) NOT NULL,
                name varchar(255) NULL,
                "lastValidated" timestamp NULL,
                status varchar(50) NOT NULL DEFAULT 'active',
                "expiresAt" timestamp NULL,
                metadata jsonb NULL,
                "createdAt" timestamp NOT NULL DEFAULT now(),
                "updatedAt" timestamp NOT NULL DEFAULT now(),
                "deletedAt" timestamp NULL,
                CONSTRAINT "PK_user_api_key" PRIMARY KEY (id)
            );`
        )

        // Index for userId (frequently queried)
        await queryRunner.query(
            `CREATE INDEX "IDX_user_api_key_userId" ON user_api_key ("userId");`
        )

        // Index for keyHash (for duplicate detection)
        await queryRunner.query(
            `CREATE INDEX "IDX_user_api_key_keyHash" ON user_api_key ("keyHash");`
        )

        // Index for status (for filtering active keys)
        await queryRunner.query(
            `CREATE INDEX "IDX_user_api_key_status" ON user_api_key (status);`
        )

        // Composite index for user + provider (common query pattern)
        await queryRunner.query(
            `CREATE INDEX "IDX_user_api_key_userId_provider" ON user_api_key ("userId", provider);`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_api_key_userId_provider";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_api_key_status";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_api_key_keyHash";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_api_key_userId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS user_api_key;`)
    }
}
