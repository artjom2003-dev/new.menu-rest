import {
  Controller, Post, Body, HttpCode, HttpStatus,
  Get, Query, Res, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthService, RegisterDto, LoginDto } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход (email + password)' })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  // ─── VK OAuth ──────────────────────────────────────

  @Get('vk')
  @ApiOperation({ summary: 'Редирект на VK OAuth' })
  vkRedirect(@Res() res: Response) {
    const clientId = this.config.get('VK_APP_ID');
    const redirectUri = `${this.config.get('BACKEND_URL')}/auth/vk/callback`;
    const url = `https://oauth.vk.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&display=popup&scope=email&response_type=code&v=5.131`;
    res.redirect(url);
  }

  @Get('vk/callback')
  @ApiOperation({ summary: 'VK OAuth callback' })
  async vkCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) throw new UnauthorizedException('VK auth failed');

    const clientId = this.config.get('VK_APP_ID');
    const clientSecret = this.config.get('VK_APP_SECRET');
    const redirectUri = `${this.config.get('BACKEND_URL')}/auth/vk/callback`;

    // Exchange code for token
    const tokenUrl = `https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    const tokenRes = await fetch(tokenUrl).then(r => r.json());

    if (!tokenRes.access_token) throw new UnauthorizedException('VK token error');

    // Get user info
    const userUrl = `https://api.vk.com/method/users.get?access_token=${tokenRes.access_token}&fields=photo_200&v=5.131`;
    const userRes = await fetch(userUrl).then(r => r.json());
    const vkUser = userRes.response?.[0];

    if (!vkUser) throw new UnauthorizedException('VK user error');

    const result = await this.service.oauthLogin('vk', {
      id: String(vkUser.id),
      name: `${vkUser.first_name} ${vkUser.last_name}`.trim(),
      email: tokenRes.email,
      avatarUrl: vkUser.photo_200,
    });

    // Redirect to frontend with token
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/login?token=${result.accessToken}`);
  }

  // ─── Telegram Login ────────────────────────────────

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram Login Widget callback' })
  async telegramLogin(@Body() data: Record<string, string>) {
    const botToken = this.config.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new UnauthorizedException('Telegram not configured');

    // Verify hash
    const { hash, ...rest } = data;
    const checkString = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (hmac !== hash) throw new UnauthorizedException('Invalid Telegram hash');

    // Check auth_date freshness (5 min)
    const authDate = Number(data.auth_date);
    if (Date.now() / 1000 - authDate > 300) throw new UnauthorizedException('Auth expired');

    return this.service.oauthLogin('telegram', {
      id: data.id,
      name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      avatarUrl: data.photo_url,
    });
  }
}
