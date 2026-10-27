import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["player", "admin"]);

export const roundStateEnum = pgEnum("round_state", ["collecting", "in_play", "closed"]);

export const predictionStateEnum = pgEnum("prediction_state", [
  "draft",
  "rating",
  "rated",
  "validating",
  "hit",
  "miss",
]);

export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved", "dismissed"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// El id coincide con auth.users.id de Supabase. No hay FK: al borrar una cuenta
// se elimina el usuario de auth y esta fila queda anonimizada.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email"),
    alias: text("alias"),
    role: roleEnum("role").notNull().default("player"),
    canCreate: boolean("can_create").notNull().default(false),
    isJury: boolean("is_jury").notNull().default(false),
    acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("users_alias_unique").on(sql`lower(${t.alias})`),
    check("users_alias_length", sql`${t.alias} is null or char_length(${t.alias}) between 3 and 20`),
  ],
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    state: roundStateEnum("state").notNull().default("collecting"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    collectingClosedAt: timestamp("collecting_closed_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("rounds_single_collecting")
      .on(t.state)
      .where(sql`${t.state} = 'collecting'`),
  ],
);

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    state: predictionStateEnum("state").notNull().default("draft"),
    value: smallint("value"),
    valueSetByAdmin: boolean("value_set_by_admin").notNull().default(false),
    resultSetByAdmin: boolean("result_set_by_admin").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAt(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
  },
  (t) => [
    index("predictions_round_idx").on(t.roundId, t.state),
    index("predictions_author_round_idx").on(t.authorId, t.roundId),
    check("predictions_text_length", sql`char_length(${t.text}) between 1 and 280`),
    check("predictions_value_range", sql`${t.value} is null or ${t.value} between 1 and 3`),
    check("predictions_value_when_rated", sql`${t.state} in ('draft', 'rating') or ${t.value} is not null`),
  ],
);

export const difficultyVotes = pgTable(
  "difficulty_votes",
  {
    predictionId: uuid("prediction_id")
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    value: smallint("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.predictionId, t.userId] }),
    check("difficulty_votes_value_range", sql`${t.value} between 1 and 3`),
  ],
);

export const validationVotes = pgTable(
  "validation_votes",
  {
    predictionId: uuid("prediction_id")
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    fulfilled: boolean("fulfilled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.predictionId, t.userId] })],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    predictionId: uuid("prediction_id")
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reports_one_per_user").on(t.predictionId, t.userId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
