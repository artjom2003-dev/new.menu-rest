import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from '@database/entities/table.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
  ) {}

  async findByRestaurant(restaurantId: number): Promise<Table[]> {
    return this.tableRepo.find({
      where: { restaurantId, isActive: true },
      order: { number: 'ASC' },
    });
  }

  async findById(id: number): Promise<Table> {
    const table = await this.tableRepo.findOneBy({ id });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async findByRestaurantAndNumber(restaurantId: number, number: number): Promise<Table | null> {
    return this.tableRepo.findOneBy({ restaurantId, number });
  }

  async create(restaurantId: number, dto: { number: number; zone?: string; capacity?: number }): Promise<Table> {
    const table = this.tableRepo.create({
      restaurantId,
      number: dto.number,
      zone: (dto.zone as any) || 'hall',
      capacity: dto.capacity || 4,
    });
    return this.tableRepo.save(table);
  }

  async updateStatus(id: number, status: string, extra?: Partial<Table>): Promise<Table> {
    const table = await this.findById(id);
    table.status = status as any;
    if (extra) Object.assign(table, extra);
    return this.tableRepo.save(table);
  }

  async transfer(sourceTableId: number, targetTableId: number): Promise<void> {
    const source = await this.findById(sourceTableId);
    const target = await this.findById(targetTableId);
    target.currentOrderId = source.currentOrderId;
    target.status = 'occupied';
    target.guestCount = source.guestCount;
    target.occupiedSince = source.occupiedSince;
    source.currentOrderId = null;
    source.status = 'free' as any;
    source.guestCount = null;
    source.occupiedSince = null;
    await this.tableRepo.save([source, target]);
  }
}
