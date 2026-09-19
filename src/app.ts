import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connect from './config/connect.ts';
import createHttpError from 'http-errors';
import { errorMiddleware } from './middlewares/error.middleware.ts';
import userRouter from './modules/user/user.route.ts';

const app: Express = express();

//Connect to Database
const connectDB = async () => {
  await connect();
};
connectDB();

// Middleware
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.use('/users', userRouter);

// 404 handler
app.use((req, res, next) => {
  next(createHttpError(404, 'Route not found'));
});
// Error middleware
app.use(errorMiddleware);

app.listen(process.env.PORT);
