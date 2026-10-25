import express, { type Express, type Request, type Response } from 'express';
import http from 'node:http';
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
import cors from 'cors';
import { corsOptions } from './config/cors.config.ts';
import { requestContextMiddleware } from './middlewares/requestContext.middleware.ts';
import { initSocketServer } from './config/socket.config.ts';
import { socketTestHtml } from './common/templates/socketTest.template.ts';
import {
  initReservationWorker,
  closeReservationWorker,
} from './modules/reservation/reservation.worker.ts';

const app: Express = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT) || 5000;

// Production safety: fail fast if insecure fallback or demo simulation flags are enabled in production
if (process.env.NODE_ENV === 'production') {
  if (process.env.ALLOW_INSECURE_CALLER_FALLBACK === 'true') {
    throw new Error(
      'FATAL: ALLOW_INSECURE_CALLER_FALLBACK must not be enabled in production.'
    );
  }
  if (process.env.ENABLE_DEMO_REFUND_SIMULATION === 'true') {
    throw new Error(
      'FATAL: ENABLE_DEMO_REFUND_SIMULATION must not be enabled in production.'
    );
  }
}

// Initialize Socket.IO Server
initSocketServer(httpServer);

// Trust reverse proxy (Render, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Attach request-scoped context (requestId, ip, user-agent, actor)
app.use(requestContextMiddleware);

// Connect to Database, Redis & BullMQ Workers
const initServices = async () => {
  try {
    await connect();
    await connectRedis();
    await initReservationWorker();
  } catch (error) {
    console.error('Fatal error initializing services:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
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
app.use(cors(corsOptions));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// Standalone Web Test Client for Realtime Notifications
app.get('/test-socket', (_req: Request, res: Response) => {
  res.send(socketTestHtml);
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

const serverUrl = (
  process.env.SERVER_URL || `http://localhost:${port}`
).replace(/\/+$/, '');
const serverDescription =
  process.env.NODE_ENV === 'production'
    ? 'Production server'
    : 'Development server';

const specWithAbsoluteServer = {
  ...(swaggerSpec as Record<string, unknown>),
  servers: [{ url: serverUrl, description: serverDescription }],
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
httpServer.listen(port, '0.0.0.0', () => {
  const publicUrl = serverUrl;
  console.log(`Server is running at ${publicUrl}`);
  console.log(`Swagger UI is available at ${publicUrl}/api-docs/`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  await closeReservationWorker();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
