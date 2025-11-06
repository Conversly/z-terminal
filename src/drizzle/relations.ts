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
} from './schema.js';

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
