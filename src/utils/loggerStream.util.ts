import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStream } from 'rotating-file-stream';
import fs from 'node:fs';

// Recover the __dirname and __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the log directory path
const logDirectory = path.join(__dirname, '../../logs');

// Check if the log directory exists, if not, create it
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Create a rotating write stream for access logs
export const accessLogStream = createStream('access.log', {
  interval: '1d', // Rotate daily
  path: logDirectory,
  maxFiles: 14, // Keep logs for 14 days
});
