import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  user as userTable,
} from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { userResponse } from './types';

export const handleGetUser = async (userId: string): Promise<userResponse> => {
  const [user] = await db
    .select({
      id: userTable.id,
      displayName: userTable.displayName,
      username: userTable.username,
      avatarUrl: userTable.avatarUrl,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!user) {
    logger.error(`User not found for user ${userId}`);
    throw new ApiError(
      `User not found for user ${userId}`,
      httpStatus.NOT_FOUND
    );
  }

  const userData: userResponse = {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    createdAt: new Date(user.createdAt),
  };

  return userData;
};