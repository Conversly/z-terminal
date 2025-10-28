import { pgTable, serial, text, timestamp, varchar, integer, boolean, json, decimal, index, uniqueIndex, uuid,foreignKey, unique, real, pgEnum, customType } from 'drizzle-orm/pg-core';
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


export const dataSourceStatus = pgEnum('DataSourceStatus', [
  'QUEUEING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);


export const chatbotStatus = pgEnum('ChatbotStatus', [
  'TRAINING',
  'ACTIVE',
  'INACTIVE',
]);


// Message type enum
export const messageType = pgEnum('MessageType', [
  'USER',
  'ASSISTANT',
]);

export const themeEnum = pgEnum('Theme', ['light', 'dark']);
export const alignEnum = pgEnum('Align', ['left', 'right']);


// Local TS types for JSON column typing. These are not DB enums, just
// compile-time helpers to validate the shape of widget styles.
type Theme = 'light' | 'dark';
type Align = 'left' | 'right';

export interface WidgetStyles {
  theme: Theme;
  headerColor: string;
  userMessageColor: string;
  buttonColor: string;
  displayName: string;
  profilePictureFile?: string | null;
  chatIcon?: string | null;
  autoOpenChatWindowAfter: number; // seconds
  alignChatButton: Align;
  messagePlaceholder: string;
  footerText: string; // HTML
  collectUserFeedback: boolean;
  regenerateMessages: boolean;
  continueShowingSuggestedMessages: boolean;
  dismissableNoticeText: string; // HTML
  hiddenPaths: string[];
}


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
  status: chatbotStatus().default('INACTIVE').notNull(), 
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

export const originDomains = pgTable('origin_domains', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  chatbotId: integer('chatbot_id').notNull(),
  apiKey: varchar('api_key', { length: 255 }).notNull(),
  domain: varchar('domain').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  // Foreign key to chatbot
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'origin_domains_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),

  // Foreign key to user (optional but helpful for filtering)
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: 'origin_domains_user_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),

  // Prevent duplicate domains for the same chatbot
  uniqueIndex('origin_domains_chatbot_id_domain_unique').on(table.chatbotId, table.domain),

  // Indexes for fast lookups
  index('origin_domains_api_key_idx').using('btree', table.apiKey.asc().nullsLast()),
  index('origin_domains_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
]);

export const dataSources = pgTable('data_source', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').notNull(),
  type: dataSourceType().notNull(),
  sourceDetails: json('source_details').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  name: varchar('name').notNull(),
  status: dataSourceStatus().default('QUEUEING').notNull(),
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

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').notNull(),
  citations: text('citations').array().notNull(),
  type: messageType().notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  uniqueConvId: varchar('unique_conv_id', { length: 255 }).notNull(),
}, (table) => [
  index('messages_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
  index('messages_unique_conv_id_idx').using('btree', table.uniqueConvId.asc().nullsLast()),

  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'messages_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);


export const widgetConfig = pgTable(
  'widget_config',
  {
    id: serial('id').primaryKey(),

    chatbotId: integer('chatbot_id')
      .notNull()
      .references(() => chatBots.id, { onUpdate: 'cascade', onDelete: 'cascade' }),

    styles: json('styles')
      .$type<WidgetStyles>()
      .notNull(),

    onlyAllowOnAddedDomains: boolean('only_allow_on_added_domains')
      .notNull()
      .default(false),

    // Store as text[] to match API shape
    initialMessage: text('initial_messages').notNull(),

    suggestedMessages: text('suggested_messages')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    
    
    allowedDomains: text('allowed_domains')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  },
  (table) => [
    unique('widget_config_chatbot_id_unique').on(table.chatbotId),
    index('widget_config_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
  ]
);