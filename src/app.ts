import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import connect from './config/connect.ts';

const app: Express = express();

//Connect to Database
const connectDB = async () => {
  await connect();
};
connectDB();

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(3000);
