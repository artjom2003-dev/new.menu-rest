import { Global, Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { NotificationService } from './services/notification.service';

@Global()
@Module({
  providers: [StorageService, NotificationService],
  exports: [StorageService, NotificationService],
})
export class CommonModule {}
