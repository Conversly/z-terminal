import { relations } from 'drizzle-orm';
import {
  user,
  authMethod,
  chatBots,
  dataSources,
  embeddings,
  messages,
  widgetConfig,
  chatbotTopics,
  chatbotTopicStats,
  whatsappAccounts,
  whatsappContacts,
  originDomains,
  subscriptionPlans,
  subscribedUsers,
  analyticsPerDay,
  whataappAnalyticsPerDay,
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
  messages: many(messages),
  widgetConfig: one(widgetConfig),
  topics: many(chatbotTopics),
  topicStats: many(chatbotTopicStats),
  whatsappAccount: one(whatsappAccounts),
  whatsappContacts: many(whatsappContacts),
  originDomains: many(originDomains),
  analyticsPerDay: many(analyticsPerDay),
  whatsappAnalyticsPerDay: many(whataappAnalyticsPerDay),
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

export const whatsappAccountsRelations = relations(whatsappAccounts, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [whatsappAccounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatsappContactsRelations = relations(whatsappContacts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [whatsappContacts.chatbotId],
    references: [chatBots.id],
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

export const analyticsPerDayRelations = relations(analyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [analyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));

export const whatsappAnalyticsPerDayRelations = relations(whataappAnalyticsPerDay, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [whataappAnalyticsPerDay.chatbotId],
    references: [chatBots.id],
  }),
}));
