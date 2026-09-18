// import passport from 'passport';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
// import { type Request } from 'express';

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID:
//         '',
//       clientSecret: '',
//       callbackURL: 'http://localhost:5000/google/callback',
//       passReqToCallback: true,
//     },
//     // Định nghĩa kiểu tường minh cho các tham số trong callback function
//     function (
//       request: Request,
//       accessToken: string,
//       refreshToken: string,
//       profile: any,
//       done: any => void
//     ): void {
//       return done(err, profile);
//     }
//   )
// );

// passport.serializeUser(function(user, done) {
//     done(null, user)
// })

// passport.deserializeUser(function(user: any, done) {
//     done(null, user)
// })
