import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '@database/entities/table.entity';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [TypeOrmModule.forFeature([Table])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
