import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

/**
 * DTO for updating a user (admin only)
 * Allows admins to update any field of a user
 */
export class UpdateUserAdminDto {
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Juan',
    description: 'First name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  firstName?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  lastName?: string;

  @ApiProperty({
    example: '+17868391882',
    description: 'Phone number (international format)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in international format (e.g., +17868391882)',
  })
  phone?: string;

  @ApiProperty({
    example: 'client',
    description: 'User role',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    example: true,
    description: 'Whether the user is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether email is verified',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether phone is verified',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  // Profile fields

  @ApiProperty({
    example: '123 Main Street, Apt 4B',
    description: 'Address',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    example: 'Florida',
    description: 'State or province',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({
    example: '33166',
    description: 'Zip/postal code',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiProperty({
    example: 'United States',
    description: 'Country',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: 'V-12345678',
    description: 'Identification number (will be encrypted)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  identificationNumber?: string;
}
