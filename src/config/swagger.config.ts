import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerSchemas } from './swaggerSchemas.config.ts';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Self Storage System API',
      version: '1.0.0',
      description: 'REST API documentation for Self Storage System Backend',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication & Authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Access token stored in HttpOnly cookie',
        },
      },
      schemas: swaggerSchemas,
    },
  },

  apis: ['./src/**/*.ts'],
});
