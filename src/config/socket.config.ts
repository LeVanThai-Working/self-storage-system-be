import type http from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis.config.ts';
import { corsOptions } from './cors.config.ts';
import { JwtUtil, type TokenPayload } from '../utils/jwt.util.ts';

let io: Server | null = null;
const jwtUtil = new JwtUtil();

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: TokenPayload;
  };
}

export const initSocketServer = (httpServer: http.Server): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      credentials: corsOptions.credentials,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Redis Adapter for multi-instance scaling & pub/sub
  try {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        if (io) {
          io.adapter(createAdapter(pubClient, subClient));
          console.log('Socket.IO Redis Adapter initialized successfully.');
        }
      })
      .catch((err) => {
        console.warn(
          'Socket.IO Redis Adapter connection failed, falling back to default in-memory adapter:',
          err?.message || err
        );
      });
  } catch (err) {
    console.warn(
      'Failed to initialize Redis Adapter for Socket.IO:',
      err instanceof Error ? err.message : err
    );
  }

  // Authentication Middleware for Handshake
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (!authHeader || typeof authHeader !== 'string') {
        return next(
          new Error('Authentication error: Missing token in handshake')
        );
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();

      const decoded = jwtUtil.verifyAccessToken(token);
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (user?.userId) {
      const userRoom = `user:${user.userId}`;
      socket.join(userRoom);
      console.log(
        `[Socket] User ${user.userId} (${user.role}) connected with socket ${socket.id} -> joined room ${userRoom}`
      );
    }

    socket.on('disconnect', (reason) => {
      console.log(
        `[Socket] Socket ${socket.id} (User: ${user?.userId || 'unknown'}) disconnected: ${reason}`
      );
    });
  });

  return io;
};

export const getSocketServer = (): Server | null => {
  return io;
};

/**
 * Emit event to a specific user's private room
 */
export const emitToUser = (
  userId: string,
  event: string,
  data: unknown
): boolean => {
  if (!io) return false;
  io.to(`user:${userId}`).emit(event, data);
  return true;
};

/**
 * Emit event to multiple users
 */
export const emitToUsers = (
  userIds: string[],
  event: string,
  data: unknown
): void => {
  if (!io || userIds.length === 0) return;
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Broadcast event to all connected sockets
 */
export const emitToAll = (event: string, data: unknown): void => {
  if (!io) return;
  io.emit(event, data);
};
