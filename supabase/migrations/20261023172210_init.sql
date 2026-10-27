CREATE TYPE "public"."prediction_state" AS ENUM('draft', 'rating', 'rated', 'validating', 'hit', 'miss');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('player', 'admin');--> statement-breakpoint
CREATE TYPE "public"."round_state" AS ENUM('collecting', 'in_play', 'closed');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "difficulty_votes" (
	"prediction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "difficulty_votes_prediction_id_user_id_pk" PRIMARY KEY("prediction_id","user_id"),
	CONSTRAINT "difficulty_votes_value_range" CHECK ("difficulty_votes"."value" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"state" "prediction_state" DEFAULT 'draft' NOT NULL,
	"value" smallint,
	"value_set_by_admin" boolean DEFAULT false NOT NULL,
	"result_set_by_admin" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	CONSTRAINT "predictions_text_length" CHECK (char_length("predictions"."text") between 1 and 280),
	CONSTRAINT "predictions_value_range" CHECK ("predictions"."value" is null or "predictions"."value" between 1 and 3),
	CONSTRAINT "predictions_value_when_rated" CHECK ("predictions"."state" in ('draft', 'rating') or "predictions"."value" is not null)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"state" "round_state" DEFAULT 'collecting' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"collecting_closed_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"alias" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"is_jury" boolean DEFAULT false NOT NULL,
	"accepted_terms_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_alias_length" CHECK ("users"."alias" is null or char_length("users"."alias") between 3 and 20)
);
--> statement-breakpoint
CREATE TABLE "validation_votes" (
	"prediction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"fulfilled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validation_votes_prediction_id_user_id_pk" PRIMARY KEY("prediction_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "difficulty_votes" ADD CONSTRAINT "difficulty_votes_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "difficulty_votes" ADD CONSTRAINT "difficulty_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_votes" ADD CONSTRAINT "validation_votes_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_votes" ADD CONSTRAINT "validation_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "predictions_round_idx" ON "predictions" USING btree ("round_id","state");--> statement-breakpoint
CREATE INDEX "predictions_author_round_idx" ON "predictions" USING btree ("author_id","round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_one_per_user" ON "reports" USING btree ("prediction_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_single_collecting" ON "rounds" USING btree ("state") WHERE "rounds"."state" = 'collecting';--> statement-breakpoint
CREATE UNIQUE INDEX "users_alias_unique" ON "users" USING btree (lower("alias"));