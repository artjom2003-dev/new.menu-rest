import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Staff } from '@database/entities/staff.entity';
import { StaffTableAssignment } from '@database/entities/staff-table-assignment.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(StaffTableAssignment)
    private readonly assignmentRepo: Repository<StaffTableAssignment>,
    private readonly jwt: JwtService,
  ) {}

  async create(restaurantId: number, dto: { name: string; pin: string; role?: string }): Promise<Staff> {
    const pinHash = await bcrypt.hash(dto.pin, 10);
    const staff = this.staffRepo.create({
      restaurantId,
      name: dto.name,
      pinHash,
      role: (dto.role as any) || 'waiter',
    });
    return this.staffRepo.save(staff);
  }

  async authByPin(restaurantId: number, pin: string): Promise<{ token: string; staff: Staff }> {
    const staffList = await this.staffRepo.find({ where: { restaurantId, isActive: true } });
    for (const s of staffList) {
      if (await bcrypt.compare(pin, s.pinHash)) {
        const token = this.jwt.sign({ staffId: s.id, restaurantId: s.restaurantId, role: s.role });
        return { token, staff: s };
      }
    }
    throw new UnauthorizedException('Invalid PIN');
  }

  async findByRestaurant(restaurantId: number): Promise<Staff[]> {
    return this.staffRepo.find({ where: { restaurantId, isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: number): Promise<Staff> {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async assignTable(staffId: number, tableId: number, shiftDate: string): Promise<StaffTableAssignment> {
    const assignment = this.assignmentRepo.create({ staffId, tableId, shiftDate });
    return this.assignmentRepo.save(assignment);
  }

  async getAssignedTables(staffId: number, shiftDate: string): Promise<number[]> {
    const assignments = await this.assignmentRepo.find({ where: { staffId, shiftDate } });
    return assignments.map(a => a.tableId);
  }
}
