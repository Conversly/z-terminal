import { pgTable, serial, text, timestamp, varchar, integer, smallint, boolean, json, decimal, index, uniqueIndex, uuid,foreignKey, unique, real, pgEnum, customType, primaryKey , date} from 'drizzle-orm/pg-core';
import { like, sql } from 'drizzle-orm';

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector';
  },
});


export const Feedback = {
  None: 0,
  Like: 1,
  Dislike: 2,
  Neutral: 3,
} as const;

export type FeedbackType = (typeof Feedback)[keyof typeof Feedback];


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
  'DRAFT',
  'QUEUEING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);


export const chatbotStatus = pgEnum('ChatbotStatus', [
  'DRAFT',
  'TRAINING',
  'ACTIVE',
  'INACTIVE',
]);


// Message type enum
export const messageType = pgEnum('MessageType', [
  'user',
  'assistant',
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
  logoUrl: text('logo_url').default(''),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#007bff'), // default blue
  topics: text('topics').array().notNull().default(sql`ARRAY[]::text[]`),
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

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey(),
  chatbotId: integer("chatbot_id").notNull(),
  topicId: integer("topic_id").references(() => chatbotTopics.id),
  citations: text("citations").array().notNull().default(sql`ARRAY[]::text[]`),
  type: messageType().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  uniqueConvId: varchar("unique_conv_id", { length: 255 }).notNull(),

  feedback: smallint("feedback").default(0).notNull(), // 0=none, 1=like, 2=dislike, 3=neutral
  feedbackComment: text("feedback_comment"),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: "messages_chatbot_id_fkey",
  })
    .onUpdate("cascade")
    .onDelete("cascade"),

  index("messages_chatbot_id_created_at_idx").on(table.chatbotId, table.createdAt.desc()),
  index("messages_chatbot_id_topic_id_created_at_idx").on(table.chatbotId, table.topicId, table.createdAt.desc()),
  index("messages_chatbot_id_unique_conv_id_created_at_idx").on(table.chatbotId, table.uniqueConvId, table.createdAt),
]);


// please do not remove comments from widget config. mai confuse ho jata hun
export const themeEnum = pgEnum('Theme', ['light', 'dark']);
export const alignEnum = pgEnum('Align', ['left', 'right']);
export const displayStyleEnum = pgEnum('DisplayStyle', ['corner', 'overlay']);

type Theme = 'light' | 'dark';
type Align = 'left' | 'right';
type DisplayStyle = 'corner' | 'overlay';

export interface WidgetStyles {
  appearance: Theme;  // renamed from 'theme'
  displayStyle: DisplayStyle;  // NEW: corner or overlay
  displayName: string;  // keeping camelCase in DB
  
  // Colors
  primaryColor: string;  // replaces headerColor, buttonColor
  widgetBubbleColour: string;  // NEW: for message bubbles
  
  // Icons & Assets
  PrimaryIcon: string;  // renamed from profilePictureFile
  widgeticon: string;  // renamed from chatIcon (for the widget button icon)
  
  // Button Configuration
  alignChatButton: Align;  // maps to buttonAlignment in frontend
  showButtonText: boolean;  // NEW
  buttonText: string;  // NEW: text shown on widget button
  widgetButtonText: string;  // NEW: alternate button text
  
  // Messages & Placeholders
  messagePlaceholder: string;
  footerText: string;  // HTML
  dismissableNoticeText: string;  // maps to dismissibleNoticeText. HTML
  
  // Dimensions
  chatWidth: string;  // NEW
  chatHeight: string;  // NEW
  
  // Behavior Flags
  autoShowInitial: boolean;  // NEW: replaces autoOpenChatWindowAfter > 0 check
  autoShowDelaySec: number;  // renamed from autoOpenChatWindowAfter
  collectUserFeedback: boolean;  // maps to collectFeedback
  regenerateMessages: boolean;  // maps to allowRegenerate
  continueShowingSuggestedMessages: boolean;  // maps to keepShowingSuggested
  
  // REMOVED: hiddenPaths (if no longer needed)
  // REMOVED: userMessageColor (now using primaryColor)
}


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

    // Keep these as separate columns (good practice)
    initialMessage: text('initial_message').notNull(),

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

export const chatbotTopics = pgTable('chatbot_topics', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }).default('#888888'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('chatbot_topics_chatbot_id_idx').on(table.chatbotId),
]);

export const chatbotTopicStats = pgTable("chatbot_topic_stats", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").notNull(),
  topicId: integer("topic_id").notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  dislikeCount: integer("dislike_count").default(0).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
}, (table) => [
  foreignKey({ columns: [table.chatbotId], foreignColumns: [chatBots.id] })
    .onUpdate("cascade")
    .onDelete("cascade"),
  foreignKey({ columns: [table.topicId], foreignColumns: [chatbotTopics.id] })
    .onUpdate("cascade")
    .onDelete("cascade"),
  unique("chatbot_topic_date_unique").on(table.chatbotId, table.topicId, table.date),
  index("chatbot_topic_stats_chatbot_date_idx").on(table.chatbotId, table.date.desc()),
  index("chatbot_topic_stats_chatbot_topic_date_idx").on(table.chatbotId, table.topicId, table.date.desc()),
]);
