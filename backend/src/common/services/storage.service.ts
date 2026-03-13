import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as sharp from 'sharp';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('MINIO_BUCKET', 'menurest-photos');
    this.publicUrl = config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');

    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
      port: Number(config.get('MINIO_PORT', 9000)),
      useSSL: config.get('MINIO_USE_SSL') === 'true',
      accessKey: config.get('MINIO_USER', 'minioadmin'),
      secretKey: config.get('MINIO_PASSWORD', ''),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        // Public read policy
        const policy = {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          }],
        };
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
        this.logger.log(`Bucket "${this.bucket}" created with public read policy`);
      }
    } catch (err) {
      this.logger.warn(`MinIO init skipped: ${(err as Error).message}`);
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ original: string; thumb: string }> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const hash = crypto.randomBytes(12).toString('hex');
    const originalKey = `${folder}/${hash}.${ext}`;
    const thumbKey = `${folder}/${hash}_thumb.webp`;

    // Upload original
    await this.client.putObject(this.bucket, originalKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    // Generate and upload thumbnail (400x300 webp)
    const thumbBuffer = await sharp(file.buffer)
      .resize(400, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    await this.client.putObject(this.bucket, thumbKey, thumbBuffer, thumbBuffer.length, {
      'Content-Type': 'image/webp',
    });

    return {
      original: `${this.publicUrl}/${this.bucket}/${originalKey}`,
      thumb: `${this.publicUrl}/${this.bucket}/${thumbKey}`,
    };
  }

  async delete(url: string): Promise<void> {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);
    await this.client.removeObject(this.bucket, key);
    // Try removing thumbnail too
    const thumbKey = key.replace(/\.(\w+)$/, '_thumb.webp');
    try { await this.client.removeObject(this.bucket, thumbKey); } catch {}
  }
}
