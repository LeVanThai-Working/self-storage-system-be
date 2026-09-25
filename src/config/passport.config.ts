import type { Request } from 'express';
import passport, { type Profile } from 'passport';
import type { VerifyCallback } from 'passport-google-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import { User } from '../modules/user/user.model.ts';
import { Profile as UserProfile } from '../modules/profile/profile.model.ts';
import { AuthProviderEnum, UserStatusEnum } from '../common/enums/user.enum.ts';
import { AppError } from '../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../common/consts/messageCode.const.ts';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('Google account does not have an email'));
        }

        const existingUser = await User.findOne({
          email,
        });

        if (existingUser) {
          if (existingUser.authProvider !== AuthProviderEnum.GOOGLE) {
            return done(
              new AppError(
                400,
                MESSAGE_CODE.MESSAGE_CODE_105 // Email already exists / registered with another provider
              )
            );
          }
          return done(null, existingUser);
        }

        const user = await User.create({
          email,
          name: profile.displayName,
          authProvider: AuthProviderEnum.GOOGLE,
          googleId: profile.id,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
        });

        // Auto-create empty profile for new Google user
        await UserProfile.findOneAndUpdate(
          { userId: user._id },
          {},
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);
