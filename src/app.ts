import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connect from './config/connect.config.ts';
import { connectRedis } from './config/redis.config.ts';
import createHttpError from 'http-errors';
import passport from 'passport';
import './config/passport.config.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.ts';
import { errorMiddleware } from './middlewares/error.middleware.ts';
import userRouter from './modules/user/user.route.ts';
import authRouter from './modules/auth/auth.route.ts';

const app: Express = express();

// Connect to Database & Redis
const initServices = async () => {
  await connect();
  await connectRedis();
};
initServices();

// Middleware
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(passport.initialize());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/users', userRouter);
app.use('/auth', authRouter);

// 404 handler
app.use((req, res, next) => {
  next(createHttpError(404, 'Route not found'));
});
// Error middleware
app.use(errorMiddleware);

app.listen(process.env.PORT);
