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
  whatsappAccounts,
  contacts,
  channelAccounts,
  smsAccounts,
  emailAccounts,
  templates,
  campaigns,
  campaignAudience,
  originDomains,
  subscriptionPlans,
  subscribedUsers,
  analyticsPerDay,
  productLaunches,
  voiceConfig,
  voiceWidgetConfig,
  voiceCallSession,
} from './schema.js';

export const userRelations = relations(user, ({ many, one }) => ({
  authMethods: many(authMethod),
  chatBots: many(chatBots),
  embeddings: many(embeddings),
  originDomains: many(originDomains),
  subscribedUsers: many(subscribedUsers),
  productLaunches: many(productLaunches),
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
  whatsappAccount: one(whatsappAccounts),
  contacts: many(contacts),
  channelAccounts: many(channelAccounts),
  smsAccounts: many(smsAccounts),
  emailAccounts: many(emailAccounts),
  templates: many(templates),
  campaigns: many(campaigns),
  originDomains: many(originDomains),
  analyticsPerDay: many(analyticsPerDay),
  productLaunches: many(productLaunches),
  voiceConfigs: many(voiceConfig),
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

export const whatsappAccountsRelations = relations(whatsappAccounts, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [whatsappAccounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [contacts.chatbotId],
    references: [chatBots.id],
  }),
  campaignAudiences: many(campaignAudience),
}));

export const channelAccountsRelations = relations(channelAccounts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [channelAccounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const smsAccountsRelations = relations(smsAccounts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [smsAccounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const emailAccountsRelations = relations(emailAccounts, ({ one }) => ({
  chatBot: one(chatBots, {
    fields: [emailAccounts.chatbotId],
    references: [chatBots.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [templates.chatbotId],
    references: [chatBots.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  chatBot: one(chatBots, {
    fields: [campaigns.chatbotId],
    references: [chatBots.id],
  }),
  template: one(templates, {
    fields: [campaigns.templateId],
    references: [templates.id],
  }),
  audience: many(campaignAudience),
}));

export const campaignAudienceRelations = relations(campaignAudience, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignAudience.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [campaignAudience.contactId],
    references: [contacts.id],
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

export const productLaunchesRelations = relations(productLaunches, ({ one }) => ({
  user: one(user, {
    fields: [productLaunches.userId],
    references: [user.id],
  }),
  chatBot: one(chatBots, {
    fields: [productLaunches.chatbotId],
    references: [chatBots.id],
  }),
}));

export const voiceConfigRelations = relations(voiceConfig, ({ one, many }) => ({
  chatbot: one(chatBots, {
    fields: [voiceConfig.chatbotId],
    references: [chatBots.id],
  }),
  widgetConfig: one(voiceWidgetConfig, {
    fields: [voiceConfig.id],
    references: [voiceWidgetConfig.voiceConfigId],
  }),
  sessions: many(voiceCallSession),
}));

export const voiceWidgetConfigRelations = relations(voiceWidgetConfig, ({ one }) => ({
  voiceConfig: one(voiceConfig, {
    fields: [voiceWidgetConfig.voiceConfigId],
    references: [voiceConfig.id],
  }),
}));

export const voiceCallSessionRelations = relations(voiceCallSession, ({ one }) => ({
  voiceConfig: one(voiceConfig, {
    fields: [voiceCallSession.voiceConfigId],
    references: [voiceConfig.id],
  }),
}));