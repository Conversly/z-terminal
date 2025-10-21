import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import {
  handleGoogleOauth,
  handleRefreshToken,
} from './auth-service';
import { setAuthCookies } from './auth-helper';
import { jwtCookieOptions } from '../../shared/helper';

export const googleOauth = catchAsync(async (req: Request, res: Response) => {
  const response = await handleGoogleOauth(req.body);
  const origin = req.headers.origin || req.headers.referer || '';

  if (!response.accessToken && !response.refreshToken) {
    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Google oauth successful',
      data: response,
    });
  }

  const responseData = setAuthCookies(res, response, origin);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Google oauth successful',
    data: responseData,
  });
});


export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const refreshTokenFromCookie = req.cookies?.['refreshToken'];

  if (!refreshTokenFromCookie) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Refresh token not provided',
    });
  }

  const response = handleRefreshToken(refreshTokenFromCookie);
  const origin = req.headers.origin || req.headers.referer || '';

  res.cookie('token', response.accessToken, jwtCookieOptions(origin, false));
  res.cookie(
    'refreshToken',
    response.refreshToken,
    jwtCookieOptions(origin, true),
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Refresh token refreshed successfully',
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  // use the same origin logic you used when setting the cookies
  const origin = req.headers.origin || req.headers.referer || '';

  res
    .clearCookie('token', jwtCookieOptions(origin, false)) // access-token cookie
    .clearCookie('refreshToken', jwtCookieOptions(origin, true)) // refresh-token cookie
    .status(httpStatus.OK)
    .json({
      success: true,
      message: 'Logged out successfully',
    });
});

export const getSystemTime = catchAsync(async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'System time fetched successfully',
    data: {
      systemTime: Date.now(),
    },
  });
});
