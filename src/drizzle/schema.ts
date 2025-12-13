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
  'EMAIL_PASSWORD',
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
  'VOICE',
  'SMS',
  'EMAIL',
]);

export const messageType = pgEnum('MessageType', [
  'user',       // end customer
  'assistant',  // AI agent
  'agent',      // human support agent
]);


export const sttProvider = pgEnum('stt_provider', [
    'DEEPGRAM',
    'WHISPER',
    'GOOGLE',
    'AZURE',
    'AWS_TRANSCRIBE',
    'ASSEMBLYAI'
]);

export const ttsProvider = pgEnum('tts_provider', [
    'ELEVENLABS',
    'OPENAI',
    'GOOGLE',
    'AZURE',
    'AWS_POLLY',
    'PLAYHT'
]);


export const voiceGender = pgEnum('voice_gender', ['MALE', 'FEMALE', 'NEUTRAL']);

export const voiceBotStatus = pgEnum('voice_bot_status', ['ACTIVE', 'INACTIVE', 'TESTING']);


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
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    verificationToken: text('verification_token'),
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

// Per-channel prompts so you can override the base systemPrompt for WhatsApp/Web/Voice
export const chatbotChannelPrompts = pgTable('chatbot_channel_prompts', {
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
    chatbotId: text('chatbot_id')
        .notNull()
        .references(() => chatBots.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    channel: messageChannel('channel').notNull(), // WIDGET, WHATSAPP, VOICE
    systemPrompt: text('system_prompt').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
}, (table) => [
    unique('chatbot_channel_prompts_chatbot_channel_unique').on(table.chatbotId, table.channel),
    index('chatbot_channel_prompts_chatbot_id_idx').on(table.chatbotId),
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

// -------------------- Channel Accounts (Unified channel account management) --------------------
export const channelAccounts = pgTable('channel_accounts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  channel: text('channel').notNull(), // WHATSAPP | SMS | EMAIL
  provider: varchar('provider', { length: 50 }).notNull(),
  accountRefId: text('account_ref_id').notNull(), // Reference to the specific account table (whatsapp_accounts.id, sms_accounts.id, email_accounts.id)
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  // Ensure only one default account per channel per chatbot
  uniqueIndex('channel_account_default_unique').on(table.chatbotId, table.channel).where(sql`${table.isDefault} = true`),
  index('channel_accounts_chatbot_channel_idx').on(table.chatbotId, table.channel),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

// -------------------- WhatsApp Accounts --------------------
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

// -------------------- SMS Accounts --------------------
export const smsAccounts = pgTable('sms_accounts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // TWILIO | VONAGE | AWS_SNS | etc.
  senderId: varchar('sender_id', { length: 50 }).notNull(),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  index('sms_accounts_chatbot_idx').on(table.chatbotId),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

// -------------------- Email Accounts --------------------
export const emailAccounts = pgTable('email_accounts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // SENDGRID | MAILGUN | AWS_SES | SMTP | etc.
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  fromName: varchar('from_name', { length: 255 }),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  smtpHost: varchar('smtp_host', { length: 255 }),
  smtpPort: integer('smtp_port'),
  smtpUsername: varchar('smtp_username', { length: 255 }),
  smtpPassword: text('smtp_password'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  index('email_accounts_chatbot_idx').on(table.chatbotId),
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  })
    .onUpdate('cascade')
    .onDelete('cascade'),
]);

// -------------------- Contacts (Unified for all channels) --------------------
export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  displayName: varchar('display_name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  email: varchar('email', { length: 255 }),
  channels: text('channels').array().notNull().default(sql`ARRAY[]::text[]`), // Array of channels: ['WHATSAPP', 'SMS', 'EMAIL']
  metadata: json('metadata').notNull().default(sql`'{}'::json`), // Channel-specific metadata
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  index('contacts_chatbot_idx').on(table.chatbotId),
  index('contacts_phone_number_idx').on(table.phoneNumber),
  index('contacts_email_idx').on(table.email),
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
  uniqueSmsConversations: integer('unique_sms_conversations').default(0).notNull(),
  uniqueEmailConversations: integer('unique_email_conversations').default(0).notNull(),
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

// --- Enums for Marketing ---
export const templateStatus = pgEnum('TemplateStatus', ['APPROVED', 'PENDING', 'REJECTED', 'ACTIVE']);
export const campaignStatus = pgEnum('CampaignStatus', ['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const campaignAudienceStatus = pgEnum('CampaignAudienceStatus', ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']);

// -------------------- Templates (Unified for all channels) --------------------
export const templates = pgTable('templates', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  channel: text('channel').notNull(), // WHATSAPP | SMS | EMAIL
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }), // For EMAIL and SMS
  content: text('content').notNull(),
  variables: json('variables').notNull().default(sql`'[]'::json`), // Array of variable names
  status: templateStatus('status').default('ACTIVE').notNull(),
  
  // Channel-specific fields (for WhatsApp Meta templates)
  metaTemplateId: varchar('meta_template_id', { length: 255 }), // WhatsApp Meta template ID
  language: varchar('language', { length: 10 }), // e.g. en_US (for WhatsApp)
  category: varchar('category', { length: 50 }), // MARKETING, UTILITY, AUTHENTICATION (for WhatsApp)
  components: json('components'), // WhatsApp template components (Header, Body, Footer, Buttons)
  
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id], 
  }).onDelete('cascade').onUpdate('cascade'),
  index('templates_chatbot_idx').on(table.chatbotId),
  index('templates_channel_idx').on(table.channel),
]);

// -------------------- Campaigns (Unified for all channels) --------------------
export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  chatbotId: text('chatbot_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  channel: text('channel').notNull(), // WHATSAPP | SMS | EMAIL
  templateId: text('template_id').notNull(), // Reference to templates
  status: campaignStatus('status').notNull().default('DRAFT'),
  scheduledAt: timestamp('scheduled_at', { mode: 'date', precision: 6 }),
  sentCount: integer('sent_count').default(0).notNull(),
  deliveredCount: integer('delivered_count').default(0).notNull(),
  readCount: integer('read_count').default(0).notNull(),
  repliedCount: integer('replied_count').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.chatbotId],
    foreignColumns: [chatBots.id],
  }).onDelete('cascade').onUpdate('cascade'),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [templates.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index('campaigns_chatbot_idx').on(table.chatbotId),
  index('campaigns_channel_idx').on(table.channel),
]);

// -------------------- Campaign Audience (Unified for all channels) --------------------
export const campaignAudience = pgTable('campaign_audience', {
  id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull(),
  contactId: text('contact_id').notNull(), // Reference to contacts
  status: campaignAudienceStatus('status').default('PENDING').notNull(), // pending | sent | delivered | read | failed
  sentAt: timestamp('sent_at', { mode: 'date', precision: 6 }),
  deliveredAt: timestamp('delivered_at', { mode: 'date', precision: 6 }),
  readAt: timestamp('read_at', { mode: 'date', precision: 6 }),
  messageId: text('message_id'), // Reference to the actual sent message
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.campaignId],
    foreignColumns: [campaigns.id],
  }).onDelete('cascade').onUpdate('cascade'),
  foreignKey({
    columns: [table.contactId],
    foreignColumns: [contacts.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index('campaign_audience_campaign_idx').on(table.campaignId),
  uniqueIndex('campaign_audience_unique').on(table.campaignId, table.contactId),
]);

// product launches table
export const productLaunches = pgTable(
    'product_launches',
    {
        id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
        
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
        
        // Basic Product Info
        name: text('name').notNull(),
        tagline: text('tagline'),
        description: text('description'),
        logoUrl: text('logo_url'),
        websiteUrl: text('website_url'),
        launchDate: timestamp('launch_date', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
        
        // Chatbot Integration (floating widget only)
        chatbotId: text('chatbot_id')
            .references(() => chatBots.id, { onUpdate: 'cascade', onDelete: 'set null' }),
        
        // Product Metadata
        tags: json('tags').$type<string[]>().default(sql`'[]'::json`),
        likesCount: integer('likes_count').default(0).notNull(),
        keyFeatures: json('key_features').$type<string[]>().default(sql`'[]'::json`),
        
        // Customization
        theme: json('theme').$type<{
            primaryColor?: string;
            backgroundColor?: string;
            textColor?: string;
            fontFamily?: string;
            layout?: string;
            heroStyle?: string;
            cardStyle?: string;
            accentColor?: string;
            gradient?: string;
        }>().default(sql`'{}'::json`),
        
        // Media Gallery
        media: json('media').$type<Array<{
            id: string;
            type: 'image' | 'video';
            url: string;
            thumbnailUrl?: string;
            alt?: string;
        }>>().default(sql`'[]'::json`),
        
        // Team Members
        team: json('team').$type<Array<{
            id: string;
            name: string;
            role: string;
            avatarUrl?: string;
            socials?: {
                twitter?: string;
                linkedin?: string;
                github?: string;
                website?: string;
            };
        }>>().default(sql`'[]'::json`),
        
        // Comments (threaded)
        comments: json('comments').$type<Array<{
            id: string;
            author: {
                name: string;
                avatarUrl?: string;
                username?: string;
                isMaker?: boolean;
                badge?: string;
            };
            content: string;
            createdAt: string;
            upvotes: number;
            replies: Array<any>;
        }>>().default(sql`'[]'::json`),
        
        // Announcement Banner
        announcement: json('announcement').$type<{
            enabled?: boolean;
            text?: string;
            link?: string;
            emoji?: string;
            backgroundColor?: string;
            textColor?: string;
            showCountdown?: boolean;
        }>().default(sql`'{}'::json`),
        
        // Countdown Timer
        countdown: json('countdown').$type<{
            enabled?: boolean;
            targetDate?: string;
            title?: string;
        }>().default(sql`'{}'::json`),
        
        // Social Links
        socialLinks: json('social_links').$type<{
            twitter?: string;
            github?: string;
            discord?: string;
            youtube?: string;
            website?: string;
        }>().default(sql`'{}'::json`),
        
        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    },
    (table) => [
        index('product_launches_user_id_idx').using('btree', table.userId.asc().nullsLast()),
        index('product_launches_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
        index('product_launches_launch_date_idx').using('btree', table.launchDate.desc().nullsLast()),
        index('product_launches_likes_count_idx').using('btree', table.likesCount.desc().nullsLast()),
    ]
);


export const testStatus = pgEnum('test_status', [
    'not_tested',
    'passed',
    'failed',
    'error',
]);

// Custom Actions Table
export const customActions = pgTable('custom_actions', {
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
    chatbotId: text('chatbot_id').notNull(),

    // Metadata
    name: varchar('name', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    description: text('description').notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),

    // API Configuration (JSONB for flexibility)
    apiConfig: json('api_config').notNull(), // Contains method, base_url, endpoint, headers, etc.

    // Tool Schema (for LLM consumption)
    toolSchema: json('tool_schema').notNull(), // JSON Schema format for parameters

    // Metadata
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow(),
    createdBy: text('created_by'),
    lastTestedAt: timestamp('last_tested_at', { mode: 'date', precision: 6 }),
    testStatus: testStatus('test_status').default('not_tested'),
    testResult: json('test_result'),
}, (table) => [
    // Foreign keys
    foreignKey({
        columns: [table.chatbotId],
        foreignColumns: [chatBots.id],
        name: 'custom_actions_chatbot_id_fkey',
    })
        .onUpdate('cascade')
        .onDelete('cascade'),
    foreignKey({
        columns: [table.createdBy],
        foreignColumns: [user.id],
        name: 'custom_actions_created_by_fkey',
    })
        .onUpdate('cascade')
        .onDelete('set null'),

    // Unique constraint
    unique('unique_action_per_chatbot').on(table.chatbotId, table.name),

    // Indexes
    index('custom_actions_chatbot_enabled_idx').on(table.chatbotId).where(sql`${table.isEnabled} = true`),
    index('custom_actions_chatbot_name_idx').on(table.chatbotId, table.name),
    index('custom_actions_updated_idx').on(table.updatedAt.desc()),
]);

// Action Templates Table (for common pre-built actions)
export const actionTemplates = pgTable('action_templates', {
    id: text('id').primaryKey().notNull().$defaultFn(() => createId()),
    name: varchar('name', { length: 100 }).notNull().unique(),
    category: varchar('category', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    description: text('description').notNull(),
    iconUrl: text('icon_url'),

    templateConfig: json('template_config').notNull(),

    requiredFields: text('required_fields').array().notNull().default(sql`ARRAY[]::text[]`),

    // Metadata
    isPublic: boolean('is_public').default(true).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow(),
}, (table) => [
    index('action_templates_category_idx').on(table.category),
    index('action_templates_usage_idx').on(table.usageCount.desc()),
]);




















// ============================================
// VOICE BOT ENUMS
// ============================================

export const turnDetectionMode = pgEnum('turn_detection_mode', [
    'stt',
    'vad',
    'realtime_llm',
    'manual'
]);

// STT Models (LiveKit supported)
export const sttModel = pgEnum('stt_model', [
    // Deepgram
    'deepgram:nova-2',
    'deepgram:nova-2-general',
    'deepgram:nova-2-conversationalai',
]);

// TTS Models (LiveKit supported)
export const ttsModel = pgEnum('tts_model', [
    // ElevenLabs
    'elevenlabs:eleven_turbo_v2_5',
    'elevenlabs:eleven_turbo_v2',
    'elevenlabs:eleven_multilingual_v2',
    'elevenlabs:eleven_flash_v2_5',
    'elevenlabs:eleven_flash_v2',
]);

// LLM Models
export const llmModel = pgEnum('llm_model', [
    // OpenAI
    'openai:gpt-4o',
    'openai:gpt-4o-mini',
    'openai:gpt-4-turbo',
    'openai:gpt-4o-realtime',
    'openai:gpt-4o-mini-realtime',
]);

export const voiceCallStatus = pgEnum('voice_call_status', [
    'INITIATED',
    'CONNECTING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'DROPPED',
    'TIMEOUT',
    'USER_AWAY'
]);

export const voiceWidgetPosition = pgEnum('voice_widget_position', [
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left'
]);

export const voiceWidgetStyle = pgEnum('voice_widget_style', [
    'floating-button',
    'embedded',
    'full-screen-overlay'
]);

export interface VoiceProviderSettings {
    // ElevenLabs
    stability?: number;           // 0-1
    similarityBoost?: number;     // 0-1
    style?: number;               // 0-1
    useSpeakerBoost?: boolean;

    // Cartesia & OpenAI TTS & Google
    speed?: number;               // Cartesia: -1 to 1, OpenAI/Google: 0.25 to 4.0
    emotion?: string[];           // Cartesia e.g., ["positivity:high", "curiosity"]

    // Google & Azure
    pitch?: number | string;      // Google: number (-20.0 to 20.0), Azure: string (e.g., "+5Hz", "-2st")
    volumeGainDb?: number;        // Google: -96.0 to 16.0

    // Azure
    rate?: string;                // e.g., "+10%", "-5%"
}

export const voiceConfig = pgTable(
    'voice_config',
    {
        id: text('id').primaryKey().notNull().$defaultFn(() => createId()),

        chatbotId: text('chatbot_id')
            .notNull()
            .references(() => chatBots.id, { onUpdate: 'cascade', onDelete: 'cascade' }),

        status: voiceBotStatus('status').default('INACTIVE').notNull(),

        turnDetection: turnDetectionMode('turn_detection').notNull().default('stt'),
        sttModel: sttModel('stt_model').notNull().default('deepgram:nova-2'),
        ttsModel: ttsModel('tts_model').notNull().default('elevenlabs:eleven_turbo_v2_5'),
        llmModel: llmModel('llm_model').notNull().default('openai:gpt-4o-mini'),

        allowInterruptions: boolean('allow_interruptions').notNull().default(true),
        discardAudioIfUninterruptible: boolean('discard_audio_if_uninterruptible').notNull().default(true),
        minInterruptionDuration: integer('min_interruption_duration').notNull().default(500), // ms
        minInterruptionWords: integer('min_interruption_words').notNull().default(0),
        minEndpointingDelay: integer('min_endpointing_delay').notNull().default(500), // ms
        maxEndpointingDelay: integer('max_endpointing_delay').notNull().default(6000), // ms
        maxToolSteps: integer('max_tool_steps').notNull().default(3),
        preemptiveGeneration: boolean('preemptive_generation').notNull().default(false),
        userAwayTimeout: real('user_away_timeout').default(15.0), // seconds, nullable

        voiceId: text('voice_id').notNull(), // Provider-specific voice ID (e.g., "rachel" for ElevenLabs)
        voiceGender: voiceGender('voice_gender').default('NEUTRAL'),
        language: varchar('language', { length: 10 }).notNull().default('en-US'), // BCP-47 format

        voiceSettings: json('voice_settings').$type<VoiceProviderSettings>(),

        systemPrompt: text('system_prompt'), // If null, falls back to chatbot's systemPrompt
        initialGreeting: text('initial_greeting').notNull().default('Hello! How can I help you today?'),
        closingMessage: text('closing_message').default('Thank you for calling. Goodbye!'),

        maxCallDurationSec: integer('max_call_duration_sec').notNull().default(600), // 10 min

        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    },
    (table) => [
        uniqueIndex('voice_config_chatbot_active_unique').on(table.chatbotId).where(sql`${table.status} = 'ACTIVE'`),
        index('voice_config_chatbot_id_idx').using('btree', table.chatbotId.asc().nullsLast()),
    ]
);


// ============================================
// VOICE WIDGET CONFIG TABLE (1:1 with voice_config)
// ============================================

export interface VoiceWidgetStyles {
    // Position & Style
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    widgetStyle: 'floating-button' | 'embedded' | 'full-screen-overlay';

    // Colors
    primaryColor: string;
    backgroundColor: string;
    activeCallColor: string;
    mutedColor: string;

    // Icons (URLs or icon identifiers)
    callButtonIcon: string;
    endCallIcon: string;
    muteIcon: string;

    // Dimensions
    buttonSize: string;           // e.g., '64px'
    expandedWidth: string;        // e.g., '320px'
    expandedHeight: string;       // e.g., '400px'

    // Button Configuration
    showButtonText: boolean;
    buttonText: string;           // e.g., "Talk to us"

    // Visual Feedback
    showWaveform: boolean;
    showCallTimer: boolean;
    showTranscription: boolean;

    // Branding
    showPoweredBy: boolean;
    avatarUrl?: string;
    displayName: string;
}

// Default widget styles
export const defaultVoiceWidgetStyles: VoiceWidgetStyles = {
    position: 'bottom-right',
    widgetStyle: 'floating-button',
    primaryColor: '#007bff',
    backgroundColor: '#ffffff',
    activeCallColor: '#28a745',
    mutedColor: '#dc3545',
    callButtonIcon: 'phone',
    endCallIcon: 'phone-off',
    muteIcon: 'mic-off',
    buttonSize: '64px',
    expandedWidth: '320px',
    expandedHeight: '400px',
    showButtonText: true,
    buttonText: 'Talk to us',
    showWaveform: true,
    showCallTimer: true,
    showTranscription: false,
    showPoweredBy: true,
    displayName: 'Voice Assistant',
};

export const voiceWidgetConfig = pgTable(
    'voice_widget_config',
    {
        id: text('id').primaryKey().notNull().$defaultFn(() => createId()),

        voiceConfigId: text('voice_config_id')
            .notNull()
            .references(() => voiceConfig.id, { onUpdate: 'cascade', onDelete: 'cascade' }),

        styles: json('styles').$type<VoiceWidgetStyles>().notNull(),

        // Domain restrictions
        onlyAllowOnAddedDomains: boolean('only_allow_on_added_domains').notNull().default(false),
        allowedDomains: text('allowed_domains').array().notNull().default(sql`ARRAY[]::text[]`),

        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    },
    (table) => [
        unique('voice_widget_config_voice_config_id_unique').on(table.voiceConfigId),
        index('voice_widget_config_voice_config_id_idx').using('btree', table.voiceConfigId.asc().nullsLast()),
    ]
);



// Transcript structure matching LiveKit's ConversationItemAddedEvent
export interface ConversationTranscript {
    items: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
        isFinal: boolean;
    }>;
}

// Metrics from LiveKit
export interface CallMetrics {
    // STT metrics
    sttLatencyMs?: number;

    // LLM metrics  
    ttft?: number;              // Time to first token
    llmLatencyMs?: number;
    tokensPerSecond?: number;
    inputTokens?: number;
    outputTokens?: number;

    // TTS metrics
    ttsLatencyMs?: number;

    // Overall
    totalLatencyMs?: number;
    interruptionCount?: number;
}

export const voiceCallSession = pgTable(
    'voice_call_session',
    {
        id: text('id').primaryKey().notNull().$defaultFn(() => createId()),

        voiceConfigId: text('voice_config_id')
            .notNull()
            .references(() => voiceConfig.id, { onUpdate: 'cascade', onDelete: 'set null' }),

        // LiveKit identifiers
        roomName: text('room_name').notNull(),
        participantIdentity: text('participant_identity'),

        status: voiceCallStatus('status').notNull().default('INITIATED'),

        // Caller info
        callerMetadata: json('caller_metadata').$type<Record<string, unknown>>(),

        // Timing
        startedAt: timestamp('started_at', { mode: 'date', withTimezone: true, precision: 6 }),
        connectedAt: timestamp('connected_at', { mode: 'date', withTimezone: true, precision: 6 }),
        endedAt: timestamp('ended_at', { mode: 'date', withTimezone: true, precision: 6 }),
        durationSec: integer('duration_sec'),

        // Transcription
        fullTranscript: json('full_transcript').$type<ConversationTranscript>(),

        // LiveKit Metrics (from MetricsCollectedEvent)
        metrics: json('metrics').$type<CallMetrics>(),

        // End reason
        endReason: text('end_reason'), // 'user_hangup', 'timeout', 'error', 'max_duration', etc.
        errorMessage: text('error_message'),

        // Usage tracking
        sttDurationMs: integer('stt_duration_ms'),
        ttsCharactersUsed: integer('tts_characters_used'),
        llmTokensUsed: integer('llm_tokens_used'),

        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true, precision: 6 }).defaultNow(),
    },
    (table) => [
        index('voice_call_session_voice_config_id_idx').using('btree', table.voiceConfigId.asc().nullsLast()),
        index('voice_call_session_started_at_idx').using('btree', table.startedAt.desc().nullsLast()),
        index('voice_call_session_status_idx').using('btree', table.status.asc().nullsLast()),
        index('voice_call_session_room_name_idx').using('btree', table.roomName.asc().nullsLast()),
    ]
);

// ============================================
// HELPER TYPE - Full Voice Options (matches LiveKit exactly)
// ============================================

export interface VoiceOptions {
    allowInterruptions: boolean;
    discardAudioIfUninterruptible: boolean;
    minInterruptionDuration: number;
    minInterruptionWords: number;
    minEndpointingDelay: number;
    maxEndpointingDelay: number;
    maxToolSteps: number;
    preemptiveGeneration: boolean;
    userAwayTimeout: number | null;
}

export const defaultVoiceOptions: VoiceOptions = {
    allowInterruptions: true,
    discardAudioIfUninterruptible: true,
    minInterruptionDuration: 500,
    minInterruptionWords: 0,
    minEndpointingDelay: 500,
    maxEndpointingDelay: 6000,
    maxToolSteps: 3,
    preemptiveGeneration: false,
    userAwayTimeout: 15.0,
};
