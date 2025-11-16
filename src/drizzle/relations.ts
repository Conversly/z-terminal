import { relations } from 'drizzle-orm';
import {
  user,
  authMethod,
  chatBots,
  dataSources,
  embeddings,
  analytics,
  citations,
  messages,
  widgetConfig,
  chatbotTopics,
  chatbotTopicStats,
  whatsapp_accounts,
  WhatsappContacts,
  originDomains,
  subscriptionPlans,
  subscribedUsers,
  AnalyticsPerDay,
  WhatappAnalyticsPerDay,
  whatsappClientUsers,
  whatsappConversations,
  whatsappMessages,
} from './schema';

export const userRelations = relations(user, ({ many, one }) => ({
  authMethods: many(authMethod),
  chatBots: many(chatBots),
  embeddings: many(embeddings),
  originDomains: many(originDomains),
  subscribedUsers: many(subscribedUsers),
}));

export const authMethodRelations = relations(authMethod, ({ one }) => ({
  user: one(user, {
    fields: [authMethod.userId],
    references: [user.id],
  }),
}));

export const chatBotsRelations = relations(chatBots, ({ one, many }) => ({
  user: one(user, {
    fields: [chatBots.userId],
    references: [user.id],
  }),
  dataSources: many(dataSources),
  embeddings: many(embeddings),
  analytics: one(analytics),
  citations: many(citations),
  messages: many(messages),
  widgetConfig: one(widgetConfig),
  topics: many(chatbotTopics),
  topicStats: many(chatbotTopicStats),
  whatsappAccount: one(whatsapp_accounts),
  whatsappContacts: many(WhatsappContacts),
  originDomains: many(originDomains),
  analyticsPerDay: many(AnalyticsPerDay),
  whatsappAnalyticsPerDay: many(WhatappAnalyticsPerDay),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [dataSources.chatbotId],
    references: [chatBots.id],
  }),
  embeddings: many(embeddings),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  user: one(user, {
    fields: [embeddings.userId],
    references: [user.id],
  }),
  chatBot: one(chatBots, {
    fields: [embeddings.chatbotId],
    references: [chatBots.id],
  }),
  dataSource: one(dataSources, {
    fields: [embeddings.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [analytics.chatbotId],
    references: [chatBots.id],
  }),
  citations: many(citations),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  analytics: one(analytics, {
    fields: [citations.analyticsId],
    references: [analytics.id],
  }),
  chatBot: one(chatBots, {
    fields: [citations.chatbotId],
    references: [chatBots.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [messages.chatbotId],
    references: [chatBots.id],
  }),
  topic: one(chatbotTopics, {
    fields: [messages.topicId],
    references: [chatbotTopics.id],
  }),
}));

export const widgetConfigRelations = relations(widgetConfig, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [widgetConfig.chatbotId],
    references: [chatBots.id],
  }),
}));

export const chatbotTopicsRelations = relations(chatbotTopics, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [chatbotTopics.chatbotId],
    references: [chatBots.id],
  }),
  messages: many(messages),
  stats: many(chatbotTopicStats),
}));

export const chatbotTopicStatsRelations = relations(chatbotTopicStats, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [chatbotTopicStats.chatbotId],
    references: [chatBots.id],
  }),
  topic: one(chatbotTopics, {
    fields: [chatbotTopicStats.topicId],
    references: [chatbotTopics.id],
  }),
}));

export const whatsappAccountsRelations = relations(whatsapp_accounts, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [whatsapp_accounts.chatbotId],
    references: [chatBots.id],
  }),
  clientUsers: many(whatsappClientUsers),
  conversations: many(whatsappConversations),
}));

export const whatsappContactsRelations = relations(WhatsappContacts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [WhatsappContacts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatsappClientUsersRelations = relations(whatsappClientUsers, ({ one, many }) => ({
  whatsappAccount: one(whatsapp_accounts, {
    fields: [whatsappClientUsers.whatsappAccountId],
    references: [whatsapp_accounts.id],
  }),
  conversations: many(whatsappConversations),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  whatsappAccount: one(whatsapp_accounts, {
    fields: [whatsappConversations.whatsappAccountId],
    references: [whatsapp_accounts.id],
  }),
  clientUser: one(whatsappClientUsers, {
    fields: [whatsappConversations.whatsappClientUserId],
    references: [whatsappClientUsers.id],
  }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, {
    fields: [whatsappMessages.conversationId],
    references: [whatsappConversations.id],
  }),
}));

export const originDomainsRelations = relations(originDomains, ({ one }) => ({
  user: one(user, {
    fields: [originDomains.userId],
    references: [user.id],
  }),
  chatBot: one(chatBots, {
    fields: [originDomains.chatbotId],
    references: [chatBots.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscribedUsers: many(subscribedUsers),
}));

export const subscribedUsersRelations = relations(subscribedUsers, ({ one }) => ({
  user: one(user, {
    fields: [subscribedUsers.userId],
    references: [user.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscribedUsers.planId],
    references: [subscriptionPlans.planId],
  }),
}));

export const analyticsPerDayRelations = relations(AnalyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [AnalyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatsappAnalyticsPerDayRelations = relations(WhatappAnalyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [WhatappAnalyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));
