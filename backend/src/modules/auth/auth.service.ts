import {
  Injectable, UnauthorizedException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';
import { User } from '@database/entities/user.entity';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsNumber()
  cityId?: number;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      cityId: dto.cityId,
    });

    const saved = await this.userRepo.save(user);
    return this.issueTokens(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'passwordHash', 'loyaltyLevel', 'loyaltyPoints', 'avatarUrl'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.issueTokens(user);
  }

  async validateJwtPayload(payload: { sub: number }) {
    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /** OAuth: find-or-create user by provider */
  async oauthLogin(provider: 'vk' | 'telegram', profile: { id: string; name?: string; email?: string; avatarUrl?: string }) {
    let user = await this.userRepo.findOneBy({ authProvider: provider, authProviderId: profile.id });

    if (!user && profile.email) {
      user = await this.userRepo.findOneBy({ email: profile.email });
      if (user) {
        user.authProvider = provider;
        user.authProviderId = profile.id;
        if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
        await this.userRepo.save(user);
      }
    }

    if (!user) {
      user = this.userRepo.create({
        email: profile.email || `${provider}_${profile.id}@menurest.local`,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        authProvider: provider,
        authProviderId: profile.id,
      });
      user = await this.userRepo.save(user);
    }

    return this.issueTokens(user);
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        loyaltyLevel: user.loyaltyLevel,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }
}
