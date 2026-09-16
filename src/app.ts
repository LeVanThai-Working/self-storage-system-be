import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connect from './config/connect.ts';
import errorHandler from 'errorhandler';
import { accessLogStream } from './utils/loggerStream.util.ts';

const app: Express = express();

//Connect to Database
const connectDB = async () => {
  await connect();
};
connectDB();

// Middleware
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
// Error handling middleware
if (process.env.NODE_ENV === 'dev') {
  // only use in development
  app.use(errorHandler());
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(3000);
