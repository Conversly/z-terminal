import { generateTokenPair, validateRefreshToken } from '../../shared/jwt';
import { db } from '../../loaders/postgres';
import {
  authMethod as authMethodTable,
  user as userTable,
} from '../../drizzle/schema';
import { eq, is } from 'drizzle-orm';
import ApiError from '../../utils/apiError';
import httpStatus from 'http-status';
import logger from '../../loaders/logger';
import {
  handleNewOauthUser,
  verifyGoogleCredentials,
} from './auth-helper';

import {
  GoogleAuthResponse,
  RefreshTokenResponse,
} from './auth-types';

export const handleGoogleOauth = async (data: {
  isVerify: boolean;
  code: string;
  credential: string;
}): Promise<GoogleAuthResponse> => {
  const { isVerify, code, credential } = data;

  const { credentialPayload, oidcToken } = await verifyGoogleCredentials(
    code,
    credential,
  );

  let existingAuth;
  
  try {
    existingAuth = await db
      .select()
      .from(authMethodTable)
      .where(eq(authMethodTable.googleSub, credentialPayload.sub))
      .innerJoin(userTable, eq(authMethodTable.userId, userTable.id));
  } catch (error) {
    logger.error('Database query error in handleGoogleOauth:', error);
    throw new ApiError(
      'Database connection error. Please try again later.',
      httpStatus.SERVICE_UNAVAILABLE,
    );
  }

  let userData: typeof userTable.$inferSelect;
  let isNewUser = false;

  if (existingAuth.length > 0) {
    // Existing user - login
    userData = existingAuth[0].user;
    isNewUser = false;
  } else {
    // New user - register
    try {
      userData = await handleNewOauthUser(credentialPayload, oidcToken);
      isNewUser = true;
    } catch (error) {
      logger.error('Database error creating new user:', error);
      throw new ApiError(
        'Failed to create user account. Please try again later.',
        httpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  const tokenPayload = {
    userId: userData.id,
    lastLogin: new Date(),
  };

  const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

  logger.info(
    'User logged in:',
    userData.id,
    accessToken,
    refreshToken
  );

  return {
    isNewUser,
    userId: userData.id,
    accessToken: accessToken!,
    refreshToken: refreshToken!,
  };
};

export const handleRefreshToken = (
  refreshTokenValue: string,
): RefreshTokenResponse => {
  const tokenData = validateRefreshToken(refreshTokenValue);

  if (!tokenData) {
    throw new ApiError(
      'Invalid or expired refresh token',
      httpStatus.UNAUTHORIZED,
    );
  }

  const tokenPayload = {
    userId: tokenData.userId,
    lastLogin: new Date(),
  };

  const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

  return {
    accessToken,
    refreshToken,
  };
};