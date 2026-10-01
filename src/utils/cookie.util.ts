import type { CookieOptions, Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  const baseOptions = getBaseCookieOptions();

  res.cookie('accessToken', accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', refreshToken, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
  });
};

export const clearAuthCookies = (res: Response) => {
  const baseOptions = getBaseCookieOptions();
  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
};
