import { pgTable, serial, text, timestamp, varchar, integer, smallint, boolean, json, decimal, index, uniqueIndex, uuid,foreignKey, unique, real, pgEnum, customType, primaryKey , date} from 'drizzle-orm/pg-core';
import { like, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

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


// Unified channel & sender enums (for cross-channel messaging)
export const messageChannel = pgEnum('MessageChannel', [
  'WIDGET',
  'WHATSAPP',
]);

export const messageType = pgEnum('MessageType', [
  'user',       // end customer
  'assistant',  // AI agent
  'agent',      // human support agent
]);

// NEW Enums for WhatsApp
export const whatsappAccountStatus = pgEnum('WhatsappAccountStatus', ['active', 'inactive']);
export const whatsappSource = pgEnum('WhatsappSource', ['organic', 'imported', 'campaign', 'api']);
export const whatsappConversationStatus = pgEnum('WhatsappConversationStatus', ['open', 'closed', 'pending', 'escalated']);
export const whatsappSenderType = pgEnum('WhatsappSenderType', ['user', 'ai', 'agent', 'system']);
export const whatsappMessageType = pgEnum('WhatsappMessageType', ['text', 'image', 'video', 'document', 'template']);
export const whatsappMessageStatus = pgEnum('WhatsappMessageStatus', ['sent', 'delivered', 'read', 'failed']);


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
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
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
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
    userId: text('user_id').notNull(),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  userId: text('user_id').notNull(),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  userId: text('user_id').notNull(),
  chatbotId: text('chatbot_id').notNull(),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  userId: text('user_id').notNull(),
  chatbotId: text('chatbot_id').notNull(),
  text: varchar('text').notNull(),
  vector: real("vector").array(), // this stores float[] of length 768
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  dataSourceId: text('data_source_id'),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull().unique('unique_chatbot_id'),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  analyticsId: text('analytics_id').notNull(),
  chatbotId: text('chatbot_id').notNull(),
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
  planId: text('plan_id').primaryKey().notNull().$defaultFn(() => createId()),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  durationInDays: integer('duration_in_days').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  priceAnnually: decimal('price_annually', { precision: 10, scale: 2 }).notNull(),
});

export const subscribedUsers = pgTable('subscribed_users', {
  subscriptionId: text('subscription_id').primaryKey().notNull().$defaultFn(() => createId()),
  userId: text('user_id').notNull(),
  planId: text('plan_id').notNull(),
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  uniqueConvId: text('unique_conv_id'),  /// contact, random generated id for widget 
  chatbotId: text('chatbot_id').notNull(),  // denormalized for fast filtering
  channel: messageChannel('channel').notNull().default('WIDGET'),  
  type: messageType('type').notNull().default('user'),
  content: text('content').notNull(),
  citations: text('citations').array().notNull().default(sql`ARRAY[]::text[]`),
  feedback: smallint('feedback').default(0).notNull(),  // 0=none, 1=like, 2=dislike, 3=neutral
  feedbackComment: text('feedback_comment'),
  channelMessageMetadata: json('channel_message_metadata'),   // whatsapp, widget metadata.
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
  topicId: text('topic_id'),
}, (table) => [
  index('messages_unique_conv_id_created_idx').on(
    table.uniqueConvId,
    table.createdAt.desc(),
  ),
  index('messages_chatbot_id_created_idx').on(
    table.chatbotId,
    table.createdAt.desc(),
  ),
  index('messages_chatbot_channel_idx').on(table.chatbotId, table.channel),
  index('messages_chatbot_feedback_idx').on(table.chatbotId, table.feedback),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  foreignKey({
    columns: [table.topicId],
    foreignColumns: [chatbotTopics.id],
  })
    .onUpdate('cascade')
    .onDelete('set null'),
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
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),

    chatbotId: text('chatbot_id')
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
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }).default('#888888'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
    name: 'chatbot_topics_chatbot_id_fkey',
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
  index('chatbot_topics_chatbot_id_idx').on(table.chatbotId),
]);

export const chatbotTopicStats = pgTable("chatbot_topic_stats", {
  id: text("id").primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text("chatbot_id").notNull(),
  topicId: text("topic_id").notNull(),
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

// WhatsApp Tables (with webhook secrets and all required details)
export const whatsappAccounts = pgTable('whatsapp_accounts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull().references(() => chatBots.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  wabaId: varchar('waba_id', { length: 255 }).notNull(),
  phoneNumberId: varchar('phone_number_id', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(),
  verifiedName: varchar('verified_name', { length: 255 }).notNull(),
  status: whatsappAccountStatus('status').default('active').notNull(),
  whatsappBusinessId: varchar('whatsapp_business_id', { length: 255 }).notNull(),
  webhookUrl: text('webhook_url'),
  verifyToken: varchar('verify_token', { length: 255 }), // Webhook verification token
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  index('whatsapp_accounts_chatbot_id_idx').on(table.chatbotId),
  index('whatsapp_accounts_phone_number_idx').on(table.phoneNumber),
  unique('whatsapp_accounts_chatbot_id_unique').on(table.chatbotId), // One WhatsApp account per chatbot
]);

export const whatsappContacts = pgTable('whatsapp_contacts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  phoneNumber: varchar('phone_number', { length: 255 }).notNull(),

  displayName: varchar('display_name', { length: 255 }),
  // Detailed metadata: { wa_id, profile, first_seen_at, last_seen_at, last_inbound_message_id, waba_id, phone_number_id, display_phone_number, source, opt_in_status, etc }
  userMetadata: json('whatsapp_user_metadata').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  uniqueIndex('whatsapp_contacts_chatbot_id_phone_number_unique').on(table.chatbotId, table.phoneNumber),
  index('whatsapp_contacts_chatbot_id_idx').on(table.chatbotId),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);



export const analyticsPerDay = pgTable('analytics_per_day', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  date: date('date').notNull().default(sql`CURRENT_DATE`),
  userMessages: integer('user_messages').default(0).notNull(),
  aiResponses: integer('ai_responses').default(0).notNull(),
  agentResponses: integer('agent_responses').default(0).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  dislikeCount: integer('dislike_count').default(0).notNull(),
  feedbackCount: integer('feedback_count').default(0).notNull(),
  uniqueWidgetConversations: integer('unique_widget_conversations').default(0).notNull(),
  uniqueWhatsappConversations: integer('unique_whatsapp_conversations').default(0).notNull(),
  uniqueContacts: integer('unique_contacts').default(0).notNull(),
  uniqueTopicIds: text('unique_topic_ids').array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  uniqueIndex('analytics_per_day_chatbot_date_unique').on(table.chatbotId, table.date),
  index('analytics_per_day_chatbot_date_idx').on(table.chatbotId, table.date.desc()),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

// only core whatsapp related columns
export const whataappAnalyticsPerDay = pgTable('whatsapp_analytics_per_day', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  date: date('date').notNull().default(sql`CURRENT_DATE`),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);
