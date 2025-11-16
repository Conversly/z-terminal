import { relations } from 'drizzle-orm';
import {
  user,
  authMethod,
  chatBots,
  embeddings,
  dataSources,
  analytics,
  citations,
  subscriptionPlans,
  subscribedUsers,
  widgetConfig,
  originDomains,
  chatbotTopics,
  chatbotTopicStats,
  messages,
  whatsapp_accounts,
  WhatsappContacts,
  AnalyticsPerDay,
  WhatappAnalyticsPerDay,
} from './schema';

export const usersRelations = relations(user, ({ many }) => ({
  subscribedUsers: many(subscribedUsers),
  authMethods: many(authMethod),
  chatBots: many(chatBots),
  embeddings: many(embeddings),
  originDomains: many(originDomains),
}));


export const authMethodRelations = relations(authMethod, ({ one }) => ({
  user: one(user, {
    fields: [authMethod.userId],
    references: [user.id],
  }),
}));

export const chatBotsRelations = relations(chatBots, ({ many, one }) => ({
  dataSources: many(dataSources),
  embeddings: many(embeddings),
  analytics: one(analytics, {
    fields: [chatBots.id],
    references: [analytics.chatbotId],
  }),
  user: one(user, {
    fields: [chatBots.userId],
    references: [user.id],
  }),
  widgetConfig: one(widgetConfig, {
    fields: [chatBots.id],
    references: [widgetConfig.chatbotId],
  }),
  originDomains: many(originDomains),
  chatbotTopics: many(chatbotTopics),
  messages: many(messages),
  whatsappAccounts: many(whatsapp_accounts),
  whatsappContacts: many(WhatsappContacts),
  analyticsPerDay: many(AnalyticsPerDay),
  whatappAnalyticsPerDay: many(WhatappAnalyticsPerDay),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [embeddings.chatbotId],
    references: [chatBots.id],
  }),
  dataSource: one(dataSources, {
    fields: [embeddings.dataSourceId],
    references: [dataSources.id],
  }),
  user: one(user, {
    fields: [embeddings.userId],
    references: [user.id],
  }),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [dataSources.chatbotId],
    references: [chatBots.id],
  }),
  embeddings: many(embeddings),
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
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscribedUsers: many(subscribedUsers),
}));

export const subscribedUsersRelations = relations(subscribedUsers, ({ one }) => ({
  user: one(user, {
    fields: [subscribedUsers.userId],
    references: [user.id],
  }),
  subscriptionPlan: one(subscriptionPlans, {
    fields: [subscribedUsers.planId],
    references: [subscriptionPlans.planId],
  }),
}));

export const widgetConfigRelations = relations(widgetConfig, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [widgetConfig.chatbotId],
    references: [chatBots.id],
  }),
}));

export const originDomainsRelations = relations(originDomains, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [originDomains.chatbotId],
    references: [chatBots.id],
  }),
  user: one(user, {
    fields: [originDomains.userId],
    references: [user.id],
  }),
}));

// Existing topics relations (added for completeness)
export const chatbotTopicsRelations = relations(chatbotTopics, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [chatbotTopics.chatbotId],
    references: [chatBots.id],
  }),
  messages: many(messages),
  topicStats: many(chatbotTopicStats),
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

export const whatsappContactsRelations = relations(WhatsappContacts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [WhatsappContacts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatsappAccountsRelations = relations(whatsapp_accounts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [whatsapp_accounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const analyticsPerDayRelations = relations(AnalyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [AnalyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatappAnalyticsPerDayRelations = relations(WhatappAnalyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [WhatappAnalyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));
