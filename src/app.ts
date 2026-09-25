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
import authRouter from './modules/auth/auth.route.ts';
import { RegisterRoutes } from './routes/routes.ts';

const app: Express = express();
const port = Number(process.env.PORT) || 5000;

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

// Swagger Documentation
// swagger-ui-express@5 + swagger-ui-dist@5 requires:
// 1. CSP header with unsafe-eval (swagger-ui-bundle uses eval internally)
// 2. Server URL must be absolute so Swagger UI OAS3 URL builder doesn't fail
app.use('/api-docs', (_req: Request, res: Response, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; worker-src blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  );
  next();
});

const specWithAbsoluteServer = {
  ...(swaggerSpec as Record<string, unknown>),
  servers: [
    { url: `http://localhost:${port}`, description: 'Development server' },
  ],
};

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specWithAbsoluteServer, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  })
);

// tsoa Routes generated from Controller Annotations
RegisterRoutes(app);

// Additional custom routes (e.g. Google OAuth redirect)
app.use('/auth', authRouter);

// 404 handler
app.use((req, res, next) => {
  next(createHttpError(404, 'Route not found'));
});
// Error middleware
app.use(errorMiddleware);

// Start the server
app.listen(port, () => {
  const swaggerUrl = `http://localhost:${port}/api-docs/`;
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`Swagger UI is available at ${swaggerUrl}`);
});
