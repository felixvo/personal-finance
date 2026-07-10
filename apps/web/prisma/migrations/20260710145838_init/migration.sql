-- Extensions (docs/03 §2) — citext must exist before the CITEXT column on "member".
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "holding_classification" AS ENUM ('ASSET', 'LIABILITY');

-- CreateEnum
CREATE TYPE "holding_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "snapshot_status" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "cash_flow_category" AS ENUM ('ACTIVE_INCOME', 'PASSIVE_INCOME', 'EXPENSE', 'INVESTMENT_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "goal_type" AS ENUM ('FIRE', 'NET_WORTH', 'HOUSE_FUND', 'EDUCATION_FUND', 'CUSTOM');

-- CreateEnum
CREATE TYPE "goal_tracking_mode" AS ENUM ('NET_WORTH', 'HOLDING_SUBSET');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "household" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "base_currency" CHAR(3) NOT NULL,
    "check_in_day" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holding_type" (
    "id" UUID NOT NULL,
    "household_id" UUID,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "classification" "holding_classification" NOT NULL,
    "is_investable" BOOLEAN NOT NULL DEFAULT false,
    "is_cash" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "holding_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holding" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "holding_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "currency" VARCHAR(12) NOT NULL,
    "status" "holding_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_snapshot" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "status" "snapshot_status" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "net_worth_base" DECIMAL(24,8),
    "investable_assets_base" DECIMAL(24,8),
    "cash_position_base" DECIMAL(24,8),
    "passive_income_base" DECIMAL(24,8),
    "savings_rate" DECIMAL(9,4),
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_holding" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "holding_id" UUID NOT NULL,
    "value" DECIMAL(24,8) NOT NULL,
    "fx_rate_to_base" DECIMAL(24,8) NOT NULL DEFAULT 1,
    "value_base" DECIMAL(24,8) NOT NULL,

    CONSTRAINT "snapshot_holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_cash_flow" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "category" "cash_flow_category" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,

    CONSTRAINT "snapshot_cash_flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "type" "goal_type" NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(24,8) NOT NULL,
    "target_date" DATE,
    "tracking_mode" "goal_tracking_mode" NOT NULL DEFAULT 'NET_WORTH',
    "status" "goal_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_holding" (
    "goal_id" UUID NOT NULL,
    "holding_id" UUID NOT NULL,

    CONSTRAINT "goal_holding_pkey" PRIMARY KEY ("goal_id","holding_id")
);

-- CreateTable
CREATE TABLE "checkin_reminder_state" (
    "household_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "reminder_sent_at" TIMESTAMPTZ(6),
    "follow_up_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "checkin_reminder_state_pkey" PRIMARY KEY ("household_id","period_month")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_provider_account_id_key" ON "account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_session_token_key" ON "session"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "member_user_id_key" ON "member"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_email_key" ON "member"("email");

-- CreateIndex
CREATE INDEX "idx_member_household" ON "member"("household_id");

-- CreateIndex
CREATE INDEX "idx_holding_type_household" ON "holding_type"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_holding_type_custom" ON "holding_type"("household_id", "slug");

-- CreateIndex
CREATE INDEX "idx_holding_household" ON "holding"("household_id");

-- CreateIndex
CREATE INDEX "idx_snapshot_household_period" ON "monthly_snapshot"("household_id", "period_month" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_snapshot_household_id_period_month_key" ON "monthly_snapshot"("household_id", "period_month");

-- CreateIndex
CREATE INDEX "idx_snapshot_holding_snapshot" ON "snapshot_holding"("snapshot_id");

-- CreateIndex
CREATE INDEX "idx_snapshot_holding_holding" ON "snapshot_holding"("holding_id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_holding_snapshot_id_holding_id_key" ON "snapshot_holding"("snapshot_id", "holding_id");

-- CreateIndex
CREATE INDEX "idx_cash_flow_snapshot" ON "snapshot_cash_flow"("snapshot_id");

-- CreateIndex
CREATE INDEX "idx_goal_household" ON "goal"("household_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding_type" ADD CONSTRAINT "holding_type_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding" ADD CONSTRAINT "holding_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holding" ADD CONSTRAINT "holding_holding_type_id_fkey" FOREIGN KEY ("holding_type_id") REFERENCES "holding_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_snapshot" ADD CONSTRAINT "monthly_snapshot_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_holding" ADD CONSTRAINT "snapshot_holding_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_holding" ADD CONSTRAINT "snapshot_holding_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_cash_flow" ADD CONSTRAINT "snapshot_cash_flow_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_holding" ADD CONSTRAINT "goal_holding_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_holding" ADD CONSTRAINT "goal_holding_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_reminder_state" ADD CONSTRAINT "checkin_reminder_state_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Hand-augmented constraints (docs/03) that Prisma's schema language can't express.
-- ============================================================

-- Global holding-type slug uniqueness (household_id IS NULL). Complements the
-- Prisma-generated uq_holding_type_custom, which only covers per-household rows
-- (NULLs are distinct, so it can't constrain the global scope). docs/03 §2.
CREATE UNIQUE INDEX "uq_holding_type_global" ON "holding_type"("slug") WHERE "household_id" IS NULL;

-- check_in_day range (docs/03 §2).
ALTER TABLE "household" ADD CONSTRAINT "household_check_in_day_range" CHECK ("check_in_day" BETWEEN 1 AND 28);

-- period_month must be the first of the month (docs/03 §2).
ALTER TABLE "monthly_snapshot" ADD CONSTRAINT "monthly_snapshot_period_first_of_month" CHECK (date_trunc('month', "period_month")::date = "period_month");
ALTER TABLE "checkin_reminder_state" ADD CONSTRAINT "checkin_reminder_period_first_of_month" CHECK (date_trunc('month', "period_month")::date = "period_month");
