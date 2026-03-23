import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';
import { User } from '@database/entities/user.entity';
import { Restaurant } from '@database/entities/restaurant.entity';

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

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private generateReferralCode(): string {
    return crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
  }

  static readonly REFERRAL_BONUS = 50; // баллов за реферала (обоим)

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Генерируем уникальный реферальный код
    let referralCode: string;
    do {
      referralCode = this.generateReferralCode();
    } while (await this.userRepo.findOneBy({ referralCode }));

    // Проверяем реферальный код пригласившего
    let referredBy: number | null = null;
    if (dto.referralCode) {
      const referrer = await this.userRepo.findOneBy({ referralCode: dto.referralCode });
      if (referrer) referredBy = referrer.id;
    }

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      cityId: dto.cityId,
      referralCode,
      referredBy,
      loyaltyPoints: referredBy ? AuthService.REFERRAL_BONUS : 0,
    });

    const saved = await this.userRepo.save(user);

    // Начисляем бонусы пригласившему
    if (referredBy) {
      await this.userRepo.increment({ id: referredBy }, 'loyaltyPoints', AuthService.REFERRAL_BONUS);
    }

    return this.issueTokens(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'passwordHash', 'loyaltyLevel', 'loyaltyPoints', 'avatarUrl', 'role'],
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

  /** Forgot password: генерирует 6-значный код и отправляет на email */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) {
      // Не раскрываем, существует ли email
      return { message: 'Если аккаунт существует, код отправлен на почту' };
    }

    // Генерируем 6-значный код
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    await this.userRepo.update(user.id, {
      resetCode: code,
      resetCodeExpiresAt: expiresAt,
    });

    // Отправляем email
    await this.sendResetEmail(dto.email, code);

    return { message: 'Если аккаунт существует, код отправлен на почту' };
  }

  /** Reset password: проверяет код и устанавливает новый пароль */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'resetCode', 'resetCodeExpiresAt', 'loyaltyLevel', 'loyaltyPoints', 'avatarUrl', 'role'],
    });

    if (!user || !user.resetCode) {
      throw new BadRequestException('Неверный код или email');
    }

    if (user.resetCode !== dto.code) {
      throw new BadRequestException('Неверный код');
    }

    if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
      throw new BadRequestException('Код истёк, запросите новый');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(user.id, {
      passwordHash,
      resetCode: null,
      resetCodeExpiresAt: null,
    });

    return this.issueTokens(user);
  }

  /** Отправка email с кодом сброса */
  private async sendResetEmail(email: string, code: string) {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');
    const from = this.config.get('SMTP_FROM', 'MenuRest <noreply@menu-rest.ru>');

    if (!host) {
      console.warn('[Auth] SMTP не настроен, код сброса:', code);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Код для сброса пароля — MenuRest',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
          <h2 style="margin: 0 0 8px;">Сброс пароля</h2>
          <p style="color: #666; margin: 0 0 24px;">Ваш код для сброса пароля:</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
            ${code}
          </div>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            Код действителен 15 минут. Если вы не запрашивали сброс — проигнорируйте это письмо.
          </p>
        </div>
      `,
    });
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

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role || 'user' };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    // For owners, include their restaurant slug
    let restaurantSlug: string | undefined;
    if (user.role === 'owner' || user.role === 'admin') {
      const restaurant = await this.restaurantRepo.findOne({
        where: { ownerId: user.id },
        select: ['id', 'slug'],
      });
      if (restaurant) restaurantSlug = restaurant.slug;
    }

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        loyaltyLevel: user.loyaltyLevel,
        loyaltyPoints: user.loyaltyPoints,
        role: user.role || 'user',
        referralCode: user.referralCode,
        ...(restaurantSlug && { restaurantSlug }),
      },
    };
  }
}
