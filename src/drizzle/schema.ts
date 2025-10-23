import { pgTable, serial, text, timestamp, varchar, integer, boolean, json, decimal, index, uniqueIndex, uuid,foreignKey, primaryKey, real, pgEnum, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector';
  },
});

export const authProvider = pgEnum('AuthProvider', [
  'PHANTOM_WALLET',
  'GOOGLE_OAUTH',
  'EMAIL',
]);


export const dataSourceType = pgEnum('DataSourceType', [
  'PDF',
  'URL',
  'TXT',
  'DOCX',
  'HTML',
  'MD',
  'CSV',
  'QNA',
  'DOCUMENT',
]);


export const user = pgTable(
  'user',
  {
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'UTC'::text)`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'UTC'::text)`)
      .notNull(),
    is2FaAuthEnabled: boolean('is2fa_auth_enabled').default(false).notNull(),
    isBanned: boolean('is_banned').default(false).notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    username: text('username'),
  }
);


export const authMethod = pgTable(
  'auth_method',
  {
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'UTC'::text)`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' })
      .default(sql`(now() AT TIME ZONE 'UTC'::text)`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    googleSub: text('google_sub'),
    googleEmail: text('google_email'),
    provider: authProvider().notNull(),
    email: text(),
  },
  (table) => [
    uniqueIndex('auth_method_google_email_key').using(
      'btree',
      table.googleEmail.asc().nullsLast()
    ),
    uniqueIndex('auth_method_google_sub_key').using(
      'btree',
      table.googleSub.asc().nullsLast()
    ),
    index('auth_method_provider_idx').using(
      'btree',
      table.provider.asc().nullsLast()
    ),
    uniqueIndex('auth_method_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'auth_method_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
);

export const chatBots = pgTable('chatbot', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name').notNull(),
  description: text('description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  apiKey: varchar('api_key', { length: 255 }),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: 'chatbot_user_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  index('chatbot_user_id_idx').using('btree', table.userId.asc().nullsLast()),
]);

export const dataSources = pgTable('data_source', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').notNull(),
  type: dataSourceType().notNull(),
  sourceDetails: json('source_details').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  name: varchar('name').notNull(),
  citation: text('citation'),
}, (table) => [
  index('idx_datasource_citation').on(table.citation),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'data_source_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

export const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  chatbotId: integer('chatbot_id').notNull(),
  topic: varchar('topic').notNull(),
  text: varchar('text').notNull(),
  vector: real("vector").array(), // this stores float[] of length 768
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  dataSourceId: integer('data_source_id'),
  citation: text('citation'),
}, (table) => [
  index('idx_embeddings_citation').on(table.citation),
  index('embeddings_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: 'embeddings_user_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'embeddings_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  foreignKey({
    columns: [table.dataSourceId],
    foreignColumns: [dataSources.id],
    name: 'embeddings_data_source_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('set null'),
]);

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').notNull().unique('unique_chatbot_id'),
  responses: integer('responses').default(0),
  likes: integer('likes').default(0),
  dislikes: integer('dislikes').default(0),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'analytics_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

export const citations = pgTable('citation', {
  id: serial('id').primaryKey(),
  analyticsId: integer('analytics_id').notNull(),
  chatbotId: integer('chatbot_id').notNull(),
  source: text('source').notNull(),
  count: integer('count').default(1),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  uniqueIndex('citation_chatbot_source_unq').on(table.chatbotId, table.source),
  foreignKey({
    columns: [table.analyticsId],
    foreignColumns: [analytics.id],
    name: 'citation_analytics_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'citation_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

export const subscriptionPlans = pgTable('subscription_plans', {
  planId: serial('plan_id').primaryKey(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  durationInDays: integer('duration_in_days').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  priceAnnually: decimal('price_annually', { precision: 10, scale: 2 }).notNull(),
});

export const subscribedUsers = pgTable('subscribed_users', {
  subscriptionId: serial('subscription_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  planId: integer('plan_id').notNull(),
  startDate: timestamp('start_date', { mode: 'date', precision: 6 }).defaultNow(),
  expiryDate: timestamp('expiry_date', { mode: 'date', precision: 6 }).notNull(),
  isActive: boolean('is_active').default(true),
  autoRenew: boolean('auto_renew').default(false),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  index('subscribed_users_user_id_idx').on(table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: 'subscribed_users_user_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  foreignKey({
    columns: [table.planId],
    foreignColumns: [subscriptionPlans.planId],
    name: 'subscribed_users_plan_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('restrict'),
]);
