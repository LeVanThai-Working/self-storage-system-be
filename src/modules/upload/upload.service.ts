import { v2 as cloudinary } from 'cloudinary';
import {
  getCloudinaryConfig,
  type CloudinaryConfig,
} from '../../config/cloudinary.config.ts';
import { CloudinaryFolderEnum } from '../../common/enums/upload.enum.ts';
import type { CloudinarySignatureResponse } from './schemas/upload.response.schema.ts';

export class UploadService {
  private config?: CloudinaryConfig;

  private getConfig(): CloudinaryConfig {
    if (!this.config) {
      this.config = getCloudinaryConfig();
      cloudinary.config({
        cloud_name: this.config.cloudName,
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        secure: true,
      });
    }
    return this.config;
  }

  /**
   * Generates a cryptographic signature and parameters for Cloudinary direct upload.
   *
   * @param folder Target folder on Cloudinary (defaults to 'self-storage/general')
   * @returns CloudinarySignatureResponse payload
   */
  public generateUploadSignature(folder?: string): CloudinarySignatureResponse {
    const config = this.getConfig();
    const targetFolder = folder?.trim() || CloudinaryFolderEnum.GENERAL;
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign: Record<string, string | number> = {
      folder: targetFolder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.apiSecret
    );

    return {
      signature,
      timestamp,
      apiKey: config.apiKey,
      cloudName: config.cloudName,
      folder: targetFolder,
    };
  }
}
