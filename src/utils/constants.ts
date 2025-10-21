import { adjectives, Config, nouns } from 'unique-username-generator';
import env from '../config/index';
import { userSetting } from '../drizzle/schema';
import { uuid as uuidv4 } from 'uuidv4';

export const apiPrefix = '/api' + `/${env.API_VERSION}`;
export const loggerConfig = {
  level: env.LOG_LEVEL || 'info',
};

export const redisApiTtlMap = {
  getHolder: 180,
  getTrade: 60,
  getPriceHistory: 60,
  getSearch: 60,
  getTokenOverview: 172800,
};

export const chainSlugs = ['solana', 'base', 'sui'];
export const sortByOptions = ['rank', 'liquidity', 'volume24hUSD'];
export const sortTypeOptions = ['asc', 'dec'];

export enum UserSettingType {
  b1 = 'b1',
  b2 = 'b2',
  b3 = 'b3',
  s1 = 's1',
  s2 = 's2',
  s3 = 's3',
}

export const raydiumLaunchLab = 'WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh';
export const raydiumAMM = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
export const raydiumCPMM = 'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL';

export const onboardingUserSettings = (userId: string) => {
  type NewUserSettings = typeof userSetting.$inferInsert;

  const newUserSettings: NewUserSettings[] = [
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.b1,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.s1,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.b2,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.s2,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.b3,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
    {
      id: uuidv4(),
      userId: userId,
      settingType: UserSettingType.s3,
      priorityFeeValue: 0.005,
      maxSlippagePercentage: 15,
      updatedAt: new Date().toUTCString(),
    },
  ];
  return newUserSettings;
};

export const usernameGeneratorConfig: Config = {
  dictionaries: [adjectives, nouns],
};
