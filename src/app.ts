import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connect from './config/connect.ts';
import errorHandler from 'errorhandler';

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
// Error handling middleware
if (process.env.NODE_ENV === 'dev') {
  // only use in development
  app.use(errorHandler());
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(3000);
