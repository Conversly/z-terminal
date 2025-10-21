import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  user as userTable,
} from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const handleGetUser = async (userId: string): Promise<any> => {
  const [user] = await db
    .select({
      id: userTable.id,
      displayName: userTable.displayName,
      username: userTable.username,
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
  return user;
};