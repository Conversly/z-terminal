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
  hashPassword,
  verifyPassword,
} from './auth-helper';

import {
  GoogleAuthResponse,
  RefreshTokenResponse,
  EmailPasswordAuthResponse,
  EmailPasswordLoginRequest,
  EmailPasswordRegisterRequest,
  RegisterResponse,
} from './auth-types';
import { uuid as uuidv4 } from 'uuidv4';
import { uniqueUsernameGenerator } from 'unique-username-generator';
import { usernameGeneratorConfig } from '../../utils/constants';
import { sendVerificationEmail } from '../../services/email-service';

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

export const handleEmailPasswordRegister = async (
  data: EmailPasswordRegisterRequest,
): Promise<RegisterResponse> => {
  const { email, password, displayName } = data;

  try {
    // Check if user with this email already exists in the user table
    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    if (existingUser.length > 0) {
      throw new ApiError(
        'An account with this email already exists',
        httpStatus.CONFLICT,
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);
    const newUserId = uuidv4();
    const verificationToken = uuidv4();

    // Create user and auth method in a transaction
    await db.transaction(async (tx) => {
      await tx
        .insert(userTable)
        .values({
          id: newUserId,
          updatedAt: new Date().toISOString(),
          email: email,
          displayName: displayName || email.split('@')[0],
          username: uniqueUsernameGenerator(usernameGeneratorConfig),
          isEmailVerified: false,
          verificationToken: verificationToken,
        });

      await tx.insert(authMethodTable).values({
        id: uuidv4(),
        updatedAt: new Date().toISOString(),
        userId: newUserId,
        email: email,
        passwordHash: passwordHash,
        provider: 'EMAIL_PASSWORD',
      });
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    logger.info('User registered, verification email sent:', newUserId);

    return {
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.error('Database error during email/password registration:', error);
    throw new ApiError(
      'Failed to create user account. Please try again later.',
      httpStatus.SERVICE_UNAVAILABLE,
    );
  }
};

export const handleEmailPasswordLogin = async (
  data: EmailPasswordLoginRequest,
): Promise<EmailPasswordAuthResponse> => {
  const { email, password } = data;

  try {
    // Find user by email
    const existingAuth = await db
      .select()
      .from(authMethodTable)
      .where(eq(authMethodTable.email, email))
      .innerJoin(userTable, eq(authMethodTable.userId, userTable.id));

    if (existingAuth.length === 0) {
      throw new ApiError(
        'Invalid email or password',
        httpStatus.UNAUTHORIZED,
      );
    }

    const authMethod = existingAuth[0].auth_method;
    const userData = existingAuth[0].user;

    // Verify provider is EMAIL_PASSWORD
    if (authMethod.provider !== 'EMAIL_PASSWORD') {
      throw new ApiError(
        'This email is registered with a different authentication method',
        httpStatus.BAD_REQUEST,
      );
    }

    // Verify password
    if (!authMethod.passwordHash) {
      throw new ApiError(
        'Password not set for this account',
        httpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const isPasswordValid = await verifyPassword(password, authMethod.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(
        'Invalid email or password',
        httpStatus.UNAUTHORIZED,
      );
    }

    // Check if email is verified
    if (!userData.isEmailVerified) {
      throw new ApiError(
        'Email not verified. Please check your email for the verification link.',
        httpStatus.UNAUTHORIZED,
      );
    }

    // Generate tokens
    const tokenPayload = {
      userId: userData.id,
      lastLogin: new Date(),
    };

    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

    logger.info('User logged in with email/password:', userData.id);

    return {
      isNewUser: false,
      userId: userData.id,
      accessToken: accessToken!,
      refreshToken: refreshToken!,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.error('Database error during email/password login:', error);
    throw new ApiError(
      'Login failed. Please try again later.',
      httpStatus.SERVICE_UNAVAILABLE,
    );
  }
};

export const verifyEmail = async (token: string): Promise<void> => {
  try {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.verificationToken, token));

    if (users.length === 0) {
      throw new ApiError('Invalid or expired verification token', httpStatus.BAD_REQUEST);
    }

    const user = users[0];

    await db
      .update(userTable)
      .set({
        isEmailVerified: true,
        verificationToken: null,
      })
      .where(eq(userTable.id, user.id));

    logger.info('Email verified for user:', user.id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error verifying email:', error);
    throw new ApiError(
      'Failed to verify email. Please try again later.',
      httpStatus.SERVICE_UNAVAILABLE,
    );
  }
};