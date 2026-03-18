import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantRequest, RestaurantRequestStatus } from '@database/entities/restaurant-request.entity';
import { CreateRestaurantRequestDto } from './dto/create-restaurant-request.dto';

@Injectable()
export class RestaurantRequestService {
  constructor(
    @InjectRepository(RestaurantRequest)
    private readonly repo: Repository<RestaurantRequest>,
  ) {}

  async create(dto: CreateRestaurantRequestDto): Promise<RestaurantRequest> {
    const request = this.repo.create(dto);
    return this.repo.save(request);
  }

  async findAll(status?: RestaurantRequestStatus): Promise<RestaurantRequest[]> {
    const where = status ? { status } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<RestaurantRequest> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Request #${id} not found`);
    return request;
  }

  async updateStatus(
    id: number,
    status: RestaurantRequestStatus,
    adminNote?: string,
  ): Promise<RestaurantRequest> {
    const request = await this.findById(id);
    request.status = status;
    if (adminNote !== undefined) request.adminNote = adminNote;
    return this.repo.save(request);
  }
}
