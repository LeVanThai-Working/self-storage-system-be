import { UploadService } from './upload.service.ts';
import { UploadController } from './upload.controller.ts';

export const uploadService = new UploadService();
export const uploadController = new UploadController(uploadService);
