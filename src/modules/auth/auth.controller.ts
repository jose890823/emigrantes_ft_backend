import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestChangePasswordDto } from './dto/request-change-password.dto';
import { ConfirmChangePasswordDto } from './dto/confirm-change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import {
  StandardResponseDto,
  ErrorResponseDto,
} from '../../common/dto/standard-response.dto';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea una nueva cuenta de usuario y envía un código OTP al email para verificación',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Datos completos requeridos para registrar un nuevo usuario',
    examples: {
      ejemplo_completo: {
        summary: 'Ejemplo completo con todos los campos requeridos',
        description: 'Usa este ejemplo completo para registrar un usuario exitosamente',
        value: {
          email: 'juan.perez@example.com',
          password: 'P@ssw0rd123!',
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '+17868391882',
        },
      },
      ejemplo_emigrantes_ft: {
        summary: 'Ejemplo con datos de Emigrantes FT',
        description: 'Ejemplo con el teléfono de contacto de la empresa',
        value: {
          email: 'cliente@emigrantesft.com',
          password: 'Cliente123!',
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          phone: '+17868391882',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente. OTP enviado al email.',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'juan.perez@example.com',
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+17868391882',
            role: 'client',
            emailVerified: false,
            isActive: true,
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          message:
            'Usuario registrado exitosamente. Por favor verifica tu email con el código OTP enviado.',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
        path: '/api/auth/register',
      },
    },
  })
  @ApiConflictResponse({
    description: 'El email ya está registrado',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    type: ErrorResponseDto,
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar email con código OTP',
    description:
      'Valida el código OTP de 6 dígitos enviado al email del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          message:
            'Email verificado exitosamente. Ya puedes iniciar sesión.',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
        path: '/api/auth/verify-email',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Código OTP inválido, expirado o intentos excedidos',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto,
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar código OTP',
    description: 'Genera y envía un nuevo código OTP al email del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo OTP enviado exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message: 'Nuevo código OTP enviado a tu email.',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
        path: '/api/auth/resend-otp',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email ya verificado',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto,
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al usuario y retorna access token (15 min) y refresh token (7 días)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Tokens generados.',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'juan.perez@example.com',
            firstName: 'Juan',
            lastName: 'Pérez',
            role: 'client',
            emailVerified: true,
            isActive: true,
            lastLoginAt: '2025-01-01T10:30:00.000Z',
          },
        },
        timestamp: '2025-01-01T10:30:00.000Z',
        path: '/api/auth/login',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas o email no verificado',
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar access token',
    description:
      'Genera nuevos access y refresh tokens usando el refresh token actual (rotation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        timestamp: '2025-01-01T10:45:00.000Z',
        path: '/api/auth/refresh',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido o expirado',
    type: ErrorResponseDto,
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.refresh(refreshTokenDto.refreshToken, userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Invalida el refresh token del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message: 'Logout exitoso',
        },
        timestamp: '2025-01-01T11:00:00.000Z',
        path: '/api/auth/logout',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
    type: ErrorResponseDto,
  })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description:
      'Genera un token de reseteo y envía un email con el enlace de recuperación',
  })
  @ApiResponse({
    status: 200,
    description: 'Email de recuperación enviado (si el email existe)',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Si el email existe, recibirás un enlace para resetear tu contraseña.',
        },
        timestamp: '2025-01-01T11:30:00.000Z',
        path: '/api/auth/forgot-password',
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetear contraseña con token',
    description:
      'Cambia la contraseña del usuario usando el token de reseteo recibido por email',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña reseteada exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
        },
        timestamp: '2025-01-01T12:00:00.000Z',
        path: '/api/auth/reset-password',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Token inválido o expirado',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambiar contraseña (LEGACY - No recomendado)',
    description:
      '[DEPRECATED] Permite al usuario autenticado cambiar su contraseña directamente. Por seguridad, se recomienda usar el flujo de 2 pasos: /change-password/request y /change-password/confirm',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Contraseña cambiada exitosamente. Por seguridad, debes volver a iniciar sesión.',
        },
        timestamp: '2025-01-01T12:30:00.000Z',
        path: '/api/auth/change-password',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Contraseña actual incorrecta',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
    type: ErrorResponseDto,
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('change-password/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Solicitar cambio de contraseña (Paso 1 de 2)',
    description:
      'Valida la contraseña actual y envía un código OTP al email del usuario para confirmar el cambio. Mayor seguridad al requerir acceso al email además del token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP enviado exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Código de verificación enviado a tu email. Usa el código para confirmar el cambio de contraseña.',
        },
        timestamp: '2025-01-01T12:30:00.000Z',
        path: '/api/auth/change-password/request',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Contraseña actual incorrecta',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
    type: ErrorResponseDto,
  })
  async requestChangePassword(
    @CurrentUser('id') userId: string,
    @Body() requestDto: RequestChangePasswordDto,
  ) {
    return this.authService.requestChangePassword(userId, requestDto);
  }

  @Post('change-password/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirmar cambio de contraseña con OTP (Paso 2 de 2)',
    description:
      'Valida el código OTP y establece la nueva contraseña. Invalida todos los refresh tokens por seguridad. El código OTP tiene 3 intentos máximo y expira en 10 minutos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Contraseña cambiada exitosamente. Por seguridad, debes volver a iniciar sesión.',
        },
        timestamp: '2025-01-01T12:35:00.000Z',
        path: '/api/auth/change-password/confirm',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Código OTP inválido, expirado, intentos excedidos o no hay solicitud pendiente',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
    type: ErrorResponseDto,
  })
  async confirmChangePassword(
    @CurrentUser('id') userId: string,
    @Body() confirmDto: ConfirmChangePasswordDto,
  ) {
    return this.authService.confirmChangePassword(userId, confirmDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener usuario autenticado',
    description: 'Retorna la información del usuario actualmente autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario obtenido exitosamente',
    type: StandardResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'juan.perez@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '+17868391882',
          role: 'client',
          emailVerified: true,
          phoneVerified: false,
          isActive: true,
          lastLoginAt: '2025-01-01T10:30:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T10:30:00.000Z',
        },
        timestamp: '2025-01-01T13:00:00.000Z',
        path: '/api/auth/me',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto,
  })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
