import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestChangePasswordDto } from './dto/request-change-password.dto';
import { ConfirmChangePasswordDto } from './dto/confirm-change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';

// Importación opcional del EmailService
let EmailService: any;
try {
  EmailService = require('../email/email.service').EmailService;
} catch (error) {
  // Módulo de email no existe - el sistema seguirá funcionando
  EmailService = null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Optional() @Inject('EmailService') private emailService?: any,
  ) {
    if (this.emailService) {
      this.logger.log('✅ EmailService disponible en AuthService');
    } else {
      this.logger.warn(
        '⚠️  EmailService no disponible - OTPs se mostrarán solo en logs',
      );
    }
  }

  /**
   * REGISTRO: Crear nuevo usuario con OTP
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phone } = registerDto;

    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash del password
    const hashedPassword = await this.hashPassword(password);

    // Generar OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = this.getOtpExpirationDate();

    // Crear usuario
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
      emailVerified: false,
      phoneVerified: false,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Enviar OTP por email (si EmailService está disponible)
    if (this.emailService && this.emailService.isAvailable()) {
      try {
        await this.emailService.sendOtpEmail({
          to: email,
          firstName,
          otpCode,
          expirationMinutes: parseInt(
            this.configService.get<string>('OTP_EXPIRATION_MINUTES', '10'),
            10,
          ),
        });
        this.logger.log(`📧 OTP enviado por email a ${email}`);
      } catch (error) {
        this.logger.error(`Error enviando OTP por email: ${error.message}`);
        // No lanzamos error, el sistema sigue funcionando
      }
    } else {
      // Si no hay EmailService, mostrar OTP en logs (modo desarrollo)
      this.logger.log(`📧 OTP generado para ${email}: ${otpCode}`);
      this.logger.warn(
        '⚠️  Email no enviado - EmailService no disponible o no configurado',
      );
    }

    // Retornar usuario sin información sensible
    const { password: _, otpCode: __, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      message:
        'Usuario registrado exitosamente. Por favor verifica tu email con el código OTP enviado.',
    };
  }

  /**
   * VERIFICAR EMAIL: Validar OTP y activar cuenta
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otpCode } = verifyEmailDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    // Verificar número máximo de intentos
    const maxAttempts = parseInt(
      this.configService.get<string>('OTP_MAX_ATTEMPTS', '3'),
      10,
    );
    if (user.hasReachedMaxOtpAttempts(maxAttempts)) {
      throw new BadRequestException(
        'Has excedido el número máximo de intentos. Solicita un nuevo código OTP.',
      );
    }

    // Verificar si el OTP ha expirado
    if (user.isOtpExpired()) {
      throw new BadRequestException(
        'El código OTP ha expirado. Solicita uno nuevo.',
      );
    }

    // Verificar el código OTP
    if (user.otpCode !== otpCode) {
      // Incrementar intentos fallidos
      user.otpAttempts += 1;
      await this.userRepository.save(user);

      const attemptsLeft = maxAttempts - user.otpAttempts;
      throw new BadRequestException(
        `Código OTP incorrecto. Te quedan ${attemptsLeft} intento(s).`,
      );
    }

    // Verificación exitosa
    user.emailVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await this.userRepository.save(user);

    this.logger.log(`✅ Email verificado para usuario: ${email}`);

    return {
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
    };
  }

  /**
   * REENVIAR OTP: Generar y enviar nuevo código
   */
  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    // Generar nuevo OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = this.getOtpExpirationDate();

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0; // Resetear intentos
    await this.userRepository.save(user);

    // Enviar OTP por email (si EmailService está disponible)
    if (this.emailService && this.emailService.isAvailable()) {
      try {
        await this.emailService.sendOtpEmail({
          to: email,
          firstName: user.firstName,
          otpCode,
          expirationMinutes: parseInt(
            this.configService.get<string>('OTP_EXPIRATION_MINUTES', '10'),
            10,
          ),
        });
        this.logger.log(`📧 Nuevo OTP enviado por email a ${email}`);
      } catch (error) {
        this.logger.error(
          `Error reenviando OTP por email: ${error.message}`,
        );
      }
    } else {
      this.logger.log(`📧 Nuevo OTP generado para ${email}: ${otpCode}`);
      this.logger.warn('⚠️  Email no enviado - EmailService no disponible');
    }

    return {
      message: 'Nuevo código OTP enviado a tu email.',
    };
  }

  /**
   * LOGIN: Autenticar usuario y generar tokens
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el email esté verificado
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Debes verificar tu email antes de iniciar sesión',
      );
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta ha sido desactivada');
    }

    // Verificar password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Guardar refresh token hasheado
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    const refreshTokenExpiresAt = this.getRefreshTokenExpirationDate();

    user.refreshToken = hashedRefreshToken;
    user.refreshTokenExpiresAt = refreshTokenExpiresAt;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`✅ Login exitoso para usuario: ${email}`);

    // Retornar tokens y usuario sin información sensible
    const {
      password: _,
      refreshToken: __,
      otpCode,
      resetPasswordToken,
      ...userWithoutSensitive
    } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutSensitive,
    };
  }

  /**
   * REFRESH: Generar nuevos tokens (rotation)
   */
  async refresh(refreshToken: string, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido');
    }

    // Verificar que el usuario tenga un refresh token
    if (!user.refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Verificar que el refresh token no haya expirado
    if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Verificar el refresh token
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Generar nuevos tokens (rotation)
    const newAccessToken = await this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user);

    // Guardar nuevo refresh token
    const hashedRefreshToken = await this.hashPassword(newRefreshToken);
    const refreshTokenExpiresAt = this.getRefreshTokenExpirationDate();

    user.refreshToken = hashedRefreshToken;
    user.refreshTokenExpiresAt = refreshTokenExpiresAt;
    await this.userRepository.save(user);

    this.logger.log(`🔄 Tokens renovados para usuario: ${user.email}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * LOGOUT: Eliminar refresh token
   */
  async logout(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Eliminar refresh token
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;
    await this.userRepository.save(user);

    this.logger.log(`👋 Logout exitoso para usuario: ${user.email}`);

    return {
      message: 'Logout exitoso',
    };
  }

  /**
   * FORGOT PASSWORD: Generar token de reseteo
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Por seguridad, no revelar si el email existe
      return {
        message:
          'Si el email existe, recibirás un enlace para resetear tu contraseña.',
      };
    }

    // Generar token de reseteo
    const resetToken = this.generateResetToken();
    const resetPasswordExpiresAt = new Date();
    resetPasswordExpiresAt.setHours(resetPasswordExpiresAt.getHours() + 1); // Expira en 1 hora

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetPasswordExpiresAt;
    await this.userRepository.save(user);

    // TODO: Enviar email con link de reseteo
    this.logger.log(`🔑 Reset token generado para ${email}: ${resetToken}`);

    return {
      message:
        'Si el email existe, recibirás un enlace para resetear tu contraseña.',
    };
  }

  /**
   * RESET PASSWORD: Cambiar contraseña con token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: resetToken },
    });

    if (!user) {
      throw new BadRequestException('Token de reseteo inválido');
    }

    // Verificar si el token ha expirado
    if (user.isResetTokenExpired()) {
      throw new BadRequestException(
        'El token de reseteo ha expirado. Solicita uno nuevo.',
      );
    }

    // Cambiar contraseña
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;

    // Invalidar refresh tokens por seguridad
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;

    await this.userRepository.save(user);

    this.logger.log(`🔒 Contraseña reseteada para usuario: ${user.email}`);

    return {
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
    };
  }

  /**
   * CHANGE PASSWORD (LEGACY): Cambiar contraseña estando autenticado - DEPRECATED
   * Mantener por compatibilidad, pero se recomienda usar el flujo de 2 pasos con OTP
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Cambiar contraseña
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;

    // Invalidar todos los refresh tokens por seguridad
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;

    await this.userRepository.save(user);

    this.logger.log(`🔒 Contraseña cambiada para usuario: ${user.email}`);

    return {
      message:
        'Contraseña cambiada exitosamente. Por seguridad, debes volver a iniciar sesión.',
    };
  }

  /**
   * REQUEST CHANGE PASSWORD: Solicitar cambio de contraseña con OTP
   * Paso 1: Valida la contraseña actual y envía OTP al email
   */
  async requestChangePassword(
    userId: string,
    requestDto: RequestChangePasswordDto,
  ) {
    const { oldPassword } = requestDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Generar código OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date();
    const otpExpirationMinutes = parseInt(
      this.configService.get<string>('OTP_EXPIRATION_MINUTES', '10'),
      10,
    );
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + otpExpirationMinutes);

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;

    await this.userRepository.save(user);

    // Enviar OTP por email
    if (this.emailService && this.emailService.isAvailable()) {
      try {
        await this.emailService.sendOtpEmail({
          to: user.email,
          firstName: user.firstName,
          otpCode,
          expirationMinutes: otpExpirationMinutes,
        });
        this.logger.log(
          `📧 OTP para cambio de contraseña enviado a ${user.email}`,
        );
      } catch (error) {
        this.logger.error(
          `Error enviando OTP para cambio de contraseña: ${error.message}`,
        );
      }
    } else {
      this.logger.log(
        `📧 OTP para cambio de contraseña generado para ${user.email}: ${otpCode}`,
      );
    }

    return {
      message:
        'Código de verificación enviado a tu email. Usa el código para confirmar el cambio de contraseña.',
    };
  }

  /**
   * CONFIRM CHANGE PASSWORD: Confirmar cambio de contraseña con OTP
   * Paso 2: Valida el OTP y cambia la contraseña
   */
  async confirmChangePassword(
    userId: string,
    confirmDto: ConfirmChangePasswordDto,
  ) {
    const { otpCode, newPassword } = confirmDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si hay un OTP
    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException(
        'No hay una solicitud de cambio de contraseña pendiente. Solicita un nuevo código.',
      );
    }

    // Verificar si el OTP ha expirado
    if (user.isOtpExpired()) {
      throw new BadRequestException(
        'El código OTP ha expirado. Solicita un nuevo código.',
      );
    }

    // Verificar intentos
    const maxAttempts = parseInt(
      this.configService.get<string>('OTP_MAX_ATTEMPTS', '3'),
      10,
    );
    if (user.otpAttempts >= maxAttempts) {
      throw new BadRequestException(
        'Has excedido el número máximo de intentos. Solicita un nuevo código.',
      );
    }

    // Verificar código OTP
    if (user.otpCode !== otpCode) {
      user.otpAttempts += 1;
      await this.userRepository.save(user);

      throw new BadRequestException(
        `Código OTP incorrecto. Te quedan ${maxAttempts - user.otpAttempts} intentos.`,
      );
    }

    // Cambiar contraseña
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;

    // Limpiar OTP
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    // Invalidar todos los refresh tokens por seguridad
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;

    await this.userRepository.save(user);

    this.logger.log(
      `🔒 Contraseña cambiada con OTP para usuario: ${user.email}`,
    );

    return {
      message:
        'Contraseña cambiada exitosamente. Por seguridad, debes volver a iniciar sesión.',
    };
  }

  /**
   * GET ME: Obtener usuario autenticado
   */
  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Retornar usuario sin información sensible
    const {
      password,
      refreshToken,
      otpCode,
      resetPasswordToken,
      ...userWithoutSensitive
    } = user;

    return userWithoutSensitive;
  }

  // ==================== MÉTODOS HELPERS PRIVADOS ====================

  /**
   * Generar hash de password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(
      this.configService.get<string>('BCRYPT_ROUNDS', '10'),
      10,
    );
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Generar código OTP aleatorio de 6 dígitos
   */
  private generateOtp(): string {
    const otpLength = parseInt(
      this.configService.get<string>('OTP_LENGTH', '6'),
      10,
    );
    return Math.floor(
      Math.pow(10, otpLength - 1) + Math.random() * 9 * Math.pow(10, otpLength - 1),
    ).toString();
  }

  /**
   * Calcular fecha de expiración del OTP
   */
  private getOtpExpirationDate(): Date {
    const expirationMinutes = parseInt(
      this.configService.get<string>('OTP_EXPIRATION_MINUTES', '10'),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    return expiresAt;
  }

  /**
   * Generar access token JWT
   */
  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
    });
  }

  /**
   * Generar refresh token JWT
   */
  private async generateRefreshToken(user: User): Promise<string> {
    const payload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });
  }

  /**
   * Calcular fecha de expiración del refresh token
   */
  private getRefreshTokenExpirationDate(): Date {
    const expirationDays = 7; // 7 días por defecto
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    return expiresAt;
  }

  /**
   * Generar token de reseteo de contraseña
   */
  private generateResetToken(): string {
    // Generar token aleatorio seguro
    const randomBytes = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
    ).join('');
    return randomBytes;
  }
}
