import httpStatus from 'http-status';
import ApiError from '../utils/apiError';
import catchAsync from '../utils/catchAsync';
import logger from '../loaders/logger';
import jwt from 'jsonwebtoken';
import * as yup from 'yup';
import env from '../config/index';
import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { User } from '../types';
import { DrizzleError } from 'drizzle-orm/errors';
import { validateRefreshToken, generateTokenPair } from './jwt';
import { jwtCookieOptions } from './helper';

export const optionalAuth = catchAsync(
  async (req: Request & { user?: User }, res: Response, next: NextFunction) => {
    let token = req.cookies?.['token'];

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as User;

        if (!decoded)
          throw new ApiError('Unauthorized', httpStatus.UNAUTHORIZED);

        req.user = decoded;

        return next();
      } catch (err: any) {
        logger.debug(`Optional auth failed: ${err.message}`);
      }
    }

    return next();
  }
);

export const auth = catchAsync(
  async (req: Request & { user?: User }, res: Response, next: NextFunction) => {
    let token = req.cookies?.['token'];
    const refreshTokenFromCookie = req.cookies?.['refreshToken'];
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as User;

        if (!decoded) {
          throw new ApiError('Unauthorized', httpStatus.UNAUTHORIZED);
        }

        req.user = decoded;

        return next();
      } catch (err: any) {
        if (err.name === 'TokenExpiredError' && refreshTokenFromCookie) {
          try {
            const tokenData = validateRefreshToken(refreshTokenFromCookie);

            if (tokenData) {
              const tokenPayload = {
                userId: tokenData.userId,
                lastLogin: new Date(),
              };

              const { accessToken, refreshToken } =
                generateTokenPair(tokenPayload);

              const origin = req.headers.origin || req.headers.referer || '';
              res.cookie('token', accessToken, jwtCookieOptions(origin, false));
              res.cookie(
                'refreshToken',
                refreshToken,
                jwtCookieOptions(origin, true)
              );

              const newDecoded = jwt.verify(
                accessToken,
                env.JWT_SECRET
              ) as User;
              req.user = newDecoded;

              return next();
            }
          } catch (refreshErr) {
            logger.debug(`Token refresh failed: ${refreshErr}`);
          }
        }

        logger.error(`Auth failed: ${err.message}`);
        throw new ApiError(
          'Unauthorized - Invalid Token',
          httpStatus.UNAUTHORIZED
        );
      }
    }

    throw new ApiError(
      'Unauthorized - No authentication method provided',
      httpStatus.UNAUTHORIZED
    );
  }
);

export const internalApiAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !env.INTERNAL_API_KEY || apiKey !== env.INTERNAL_API_KEY) {
    throw new ApiError('Unauthorized', httpStatus.UNAUTHORIZED);
  }
  next();
};

const handleTokenError = (err: any) => {
  if (err.name === 'TokenExpiredError') return 'Login Expired';

  return 'Invalid Token';
};

export const errorConverter = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof JsonWebTokenError) {
    logger.error(err);
    return next(new ApiError(handleTokenError(err), httpStatus.UNAUTHORIZED));
  } else if (err instanceof DrizzleError) {
    logger.error(err);
    return next(
      new ApiError('Oops! something went wrong', httpStatus.BAD_REQUEST)
    );
  } else if (err.code && typeof err.code === 'string') {
    logger.error(err);

    if (err.code === '23505') {
      return next(new ApiError('Duplicate entry found', httpStatus.CONFLICT));
    } else if (err.code === '23503') {
      return next(
        new ApiError('Referenced record does not exist', httpStatus.BAD_REQUEST)
      );
    }

    return next(
      new ApiError(
        'Oops! something went wrong',
        httpStatus.INTERNAL_SERVER_ERROR
      )
    );
  } else if (!(err instanceof ApiError)) {
    logger.error(err);
    return next(
      new ApiError(
        'Oops! something went wrong',
        httpStatus.INTERNAL_SERVER_ERROR
      )
    );
  }
  return next(err);
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const success = err.success || false;
  const message = err.message || 'Oops! something went wrong';

  if (env.NODE_ENV === 'dev')
    logger.error(`message: ${message}, stack: ${err.stack}`);
  else
    logger.error(
      `${JSON.stringify({
        request: {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          body: req.body,
          query: req.query,
          params: req.params,
        },
        error: message,
      })}`
    );

  interface ErrorResponseType {
    success: any;
    message: any;
    data?: any;
  }

  const errorResponse: ErrorResponseType = {
    success,
    message,
  };

  if (err.data) errorResponse.data = err.data;

  res.status(statusCode).json(errorResponse);
};

export const validate = (
  location: 'query' | 'body' | 'params',
  schema: yup.ObjectSchema<any>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      type RequestLocation = 'query' | 'body' | 'params';

      let _location: RequestLocation;

      switch (location) {
        case 'query':
          _location = 'query';
          break;
        case 'body':
          _location = 'body';
          break;
        case 'params':
          _location = 'params';
          break;
        default:
          throw new Error(`Invalid location: ${location}`);
      }

      req[_location] = await schema.validate(req[_location], {
        abortEarly: false,
      });

      next();
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        const errorMessages = error.errors.join(', ');
        return res.status(400).json({ error: errorMessages });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(400).json({ error: 'An unknown error occurred' });
    }
  };
};

export const httpRequestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const contentLength = res.get('content-length') || 0;

    const routePattern = req.route?.path || req.path;

    const fullApiPath = req.originalUrl.split('?')[0].replace(/^\/api\/v1/, '');

    const logData = {
      http_method: req.method,
      http_url: req.originalUrl,
      http_api_path: fullApiPath,
      http_status_code: res.statusCode,
      http_response_time_ms: duration,
      http_response_size_bytes: Number(contentLength) || 0,

      user_agent: req.get('User-Agent') || 'unknown',
      client_ip: req.ip || req.connection.remoteAddress || 'unknown',
      request_id: req.headers['x-request-id'] || 'unknown',

      response_time_category:
        duration < 300 ? 'fast' : duration < 1500 ? 'normal' : 'slow',
      status_category:
        res.statusCode < 400
          ? 'success'
          : res.statusCode < 500
          ? 'client_error'
          : 'server_error',

      service_name: 'whale-terminal',
      environment: env.NODE_ENV || 'dev',

      timestamp: new Date().toISOString(),
    };

    logger.info('HTTP Request', logData);
  });

  next();
};
