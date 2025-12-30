import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration: Add Wallet and WalletTransaction tables for M.A.T.E. billing system
 * 
 * This migration creates the core billing infrastructure:
 * - wallet: Stores user balance and auto-topup settings
 * - wallet_transaction: Immutable audit log for all wallet movements
 * 
 * Pricing Model:
 * - Voice: €1.50/minute (150 cents/minute)
 * - LLM: €0.03/1K tokens (3 cents/1K tokens)
 * - Minimum top-up: €10
 */
export class AddWalletTables1735588800000 implements MigrationInterface {
    name = 'AddWalletTables1735588800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create wallet table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallet" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "userId" UUID NOT NULL,
                "balance_cents" INTEGER NOT NULL DEFAULT 0,
                "auto_topup_enabled" BOOLEAN NOT NULL DEFAULT false,
                "auto_topup_threshold_cents" INTEGER NOT NULL DEFAULT 500,
                "auto_topup_amount_cents" INTEGER NOT NULL DEFAULT 2500,
                "stripe_customer_id" VARCHAR(255),
                "stripe_payment_method_id" VARCHAR(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_wallet_userId" UNIQUE ("userId"),
                CONSTRAINT "CHK_wallet_balance" CHECK ("balance_cents" >= 0),
                CONSTRAINT "FK_wallet_user" FOREIGN KEY ("userId") 
                    REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `)

        // Create indexes for wallet
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_userId" ON "wallet" ("userId")
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_stripe_customer" ON "wallet" ("stripe_customer_id")
        `)

        // Create wallet_transaction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallet_transaction" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "wallet_id" UUID NOT NULL,
                "type" VARCHAR(20) NOT NULL,
                "usage_type" VARCHAR(10),
                "amount_cents" INTEGER NOT NULL,
                "balance_after_cents" INTEGER NOT NULL,
                "voice_seconds" INTEGER,
                "tokens_used" INTEGER,
                "flow_id" VARCHAR(255),
                "chatflow_id" VARCHAR(255),
                "call_id" VARCHAR(255),
                "model_name" VARCHAR(100),
                "description" TEXT,
                "stripe_payment_id" VARCHAR(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_transaction" PRIMARY KEY ("id"),
                CONSTRAINT "FK_wallet_transaction_wallet" FOREIGN KEY ("wallet_id") 
                    REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `)

        // Create indexes for wallet_transaction
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_wallet_created" 
            ON "wallet_transaction" ("wallet_id", "created_at" DESC)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_usage_type_created" 
            ON "wallet_transaction" ("usage_type", "created_at" DESC)
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_type" 
            ON "wallet_transaction" ("type")
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_wallet_transaction_stripe_payment" 
            ON "wallet_transaction" ("stripe_payment_id")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transaction_stripe_payment"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transaction_type"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transaction_usage_type_created"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_transaction_wallet_created"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_stripe_customer"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_userId"`)

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transaction"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet"`)
    }
}
