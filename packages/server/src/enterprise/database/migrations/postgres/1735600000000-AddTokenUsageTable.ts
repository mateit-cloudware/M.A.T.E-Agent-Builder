import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration: Add TokenUsage table for M.A.T.E. LLM tracking
 * 
 * This migration creates the token_usage table for tracking:
 * - Per-request token consumption
 * - Cost calculation and billing
 * - Usage analytics and reporting
 */
export class AddTokenUsageTable1735600000000 implements MigrationInterface {
    name = 'AddTokenUsageTable1735600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "token_usage" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "userId" UUID NOT NULL,
                "workspaceId" UUID,
                "chatflowId" UUID,
                "model" VARCHAR(100) NOT NULL,
                "promptTokens" INTEGER NOT NULL DEFAULT 0,
                "completionTokens" INTEGER NOT NULL DEFAULT 0,
                "totalTokens" INTEGER NOT NULL DEFAULT 0,
                "costCents" INTEGER NOT NULL DEFAULT 0,
                "inputCostCents" INTEGER NOT NULL DEFAULT 0,
                "outputCostCents" INTEGER NOT NULL DEFAULT 0,
                "requestType" VARCHAR(50) NOT NULL DEFAULT 'chat_completion',
                "sessionId" VARCHAR(255),
                "latencyMs" INTEGER NOT NULL DEFAULT 0,
                "success" BOOLEAN NOT NULL DEFAULT true,
                "errorMessage" VARCHAR(500),
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "pk_token_usage" PRIMARY KEY ("id"),
                CONSTRAINT "fk_token_usage_user" FOREIGN KEY ("userId") 
                    REFERENCES "user"("id") ON DELETE CASCADE
            )
        `)

        // Indizes für häufige Abfragen
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_userId" ON "token_usage" ("userId")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_workspaceId" ON "token_usage" ("workspaceId")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_chatflowId" ON "token_usage" ("chatflowId")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_model" ON "token_usage" ("model")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_requestType" ON "token_usage" ("requestType")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_createdAt" ON "token_usage" ("createdAt")
        `)

        // Composite Index für User + Zeit Range Queries
        await queryRunner.query(`
            CREATE INDEX "idx_token_usage_user_date" ON "token_usage" ("userId", "createdAt" DESC)
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_user_date"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_createdAt"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_requestType"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_model"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_chatflowId"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_workspaceId"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usage_userId"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "token_usage"`)
    }
}
