import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from '../../auth/entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto';
import { SendPhoneOtpDto, VerifyPhoneDto } from '../dto/verify-phone.dto';
import { UserFilterDto } from '../dto/user-filter.dto';
import { SmsService } from './sms.service';
import { EncryptionService } from '../../../shared/encryption.service';
import * as crypto from 'crypto';

/**
 * Users Service
 * Handles user profile management, verification, and administration
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly OTP_EXPIRATION_MINUTES = 10;
  private readonly OTP_MAX_ATTEMPTS = 3;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private smsService: SmsService,
    private encryptionService: EncryptionService,
  ) {}

  // ============================================
  // USER PROFILE MANAGEMENT
  // ============================================

  /**
   * Get user profile by ID
   */
  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Update basic fields
    if (updateDto.firstName) user.firstName = updateDto.firstName;
    if (updateDto.lastName) user.lastName = updateDto.lastName;
    if (updateDto.address) user.address = updateDto.address;
    if (updateDto.city) user.city = updateDto.city;
    if (updateDto.state) user.state = updateDto.state;
    if (updateDto.zipCode) user.zipCode = updateDto.zipCode;
    if (updateDto.country) user.country = updateDto.country;
    if (updateDto.dateOfBirth)
      user.dateOfBirth = new Date(updateDto.dateOfBirth);

    // Encrypt identification number if provided
    if (updateDto.identificationNumber) {
      user.identificationNumber = this.encryptionService.encrypt(
        updateDto.identificationNumber,
      );
    }

    // If phone changed, mark as unverified
    if (updateDto.phone && updateDto.phone !== user.phone) {
      user.phone = updateDto.phone;
      user.phoneVerified = false;
      this.logger.log(`Phone changed for user ${userId}, marked as unverified`);
    }

    const updated = await this.userRepository.save(user);
    this.logger.log(`✅ Profile updated for user ${userId}`);

    return updated;
  }

  /**
   * Update profile photo
   */
  async updateProfilePhoto(userId: string, photoUrl: string): Promise<User> {
    const user = await this.findById(userId);
    user.profilePhoto = photoUrl;

    const updated = await this.userRepository.save(user);
    this.logger.log(`📸 Profile photo updated for user ${userId}`);

    return updated;
  }

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.profilePhoto = null;

    const updated = await this.userRepository.save(user);
    this.logger.log(`🗑️  Profile photo deleted for user ${userId}`);

    return updated;
  }

  // ============================================
  // PHONE VERIFICATION
  // ============================================

  /**
   * Send phone verification OTP
   */
  async sendPhoneOtp(userId: string, dto: SendPhoneOtpDto): Promise<void> {
    const user = await this.findById(userId);

    // Check if phone is already verified
    if (user.phoneVerified && user.phone === dto.phone) {
      throw new BadRequestException('Phone already verified');
    }

    // Generate OTP code
    const otpCode = this.generateOtpCode();
    const otpExpiresAt = new Date(
      Date.now() + this.OTP_EXPIRATION_MINUTES * 60 * 1000,
    );

    // Save OTP to user
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;

    // Update phone if different
    if (user.phone !== dto.phone) {
      user.phone = dto.phone;
      user.phoneVerified = false;
    }

    await this.userRepository.save(user);

    // Log OTP in development for testing when SMS doesn't work
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`🔐 [DEV] OTP Code for ${dto.phone}: ${otpCode}`);
    }

    // Send OTP via SMS
    await this.smsService.sendPhoneVerificationOtp(dto.phone, otpCode);

    this.logger.log(`📱 OTP sent to ${dto.phone} for user ${userId}`);
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone(userId: string, dto: VerifyPhoneDto): Promise<User> {
    const user = await this.findById(userId);

    // Check if already verified
    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
    }

    // Check if OTP exists
    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    // Check if OTP expired
    if (user.isOtpExpired()) {
      throw new BadRequestException('OTP expired. Please request a new one');
    }

    // Check max attempts
    if (user.hasReachedMaxOtpAttempts(this.OTP_MAX_ATTEMPTS)) {
      throw new BadRequestException(
        'Maximum OTP attempts reached. Please request a new one',
      );
    }

    // Verify OTP
    if (user.otpCode !== dto.otpCode) {
      user.otpAttempts += 1;
      await this.userRepository.save(user);

      throw new BadRequestException(
        `Invalid OTP. ${this.OTP_MAX_ATTEMPTS - user.otpAttempts} attempts remaining`,
      );
    }

    // Mark phone as verified
    user.phoneVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    const updated = await this.userRepository.save(user);

    this.logger.log(`✅ Phone verified for user ${userId}`);

    return updated;
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Find all users with filters (admin)
   */
  async findAll(filter: UserFilterDto): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: FindOptionsWhere<User> = {};

    if (filter.role) where.role = filter.role;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.emailVerified !== undefined)
      where.emailVerified = filter.emailVerified;
    if (filter.phoneVerified !== undefined)
      where.phoneVerified = filter.phoneVerified;

    const [data, total] = await this.userRepository.findAndCount({
      where,
      skip: (filter.page! - 1) * filter.limit!,
      take: filter.limit,
      order: {
        [filter.sortBy!]: filter.sortOrder,
      },
    });

    return {
      data,
      total,
      page: filter.page!,
      limit: filter.limit!,
      totalPages: Math.ceil(total / filter.limit!),
    };
  }

  /**
   * Update user role (admin)
   */
  async updateRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findById(userId);

    // Prevent demoting the last super admin
    if (user.role === UserRole.SUPER_ADMIN && role !== UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last super admin',
        );
      }
    }

    user.role = role;
    const updated = await this.userRepository.save(user);

    this.logger.log(`👤 Role updated to ${role} for user ${userId}`);

    return updated;
  }

  /**
   * Activate/deactivate user (admin)
   */
  async toggleActive(userId: string, isActive: boolean): Promise<User> {
    const user = await this.findById(userId);

    // Prevent deactivating super admins
    if (user.role === UserRole.SUPER_ADMIN && !isActive) {
      throw new BadRequestException('Cannot deactivate super admin');
    }

    user.isActive = isActive;
    const updated = await this.userRepository.save(user);

    this.logger.log(
      `${isActive ? '✅' : '❌'} User ${userId} ${isActive ? 'activated' : 'deactivated'}`,
    );

    return updated;
  }

  /**
   * Delete user (admin - soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.findById(userId);

    // Prevent deleting super admins
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin');
    }

    await this.userRepository.softRemove(user);

    this.logger.log(`🗑️  User ${userId} soft deleted`);
  }

  /**
   * Update user by admin (any field)
   */
  async updateUserAdmin(
    userId: string,
    updateDto: UpdateUserAdminDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Check email uniqueness if changing email
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }

      user.email = updateDto.email;
      // If email changed, mark as unverified
      user.emailVerified = updateDto.emailVerified ?? false;
    }

    // Update basic fields
    if (updateDto.firstName !== undefined) user.firstName = updateDto.firstName;
    if (updateDto.lastName !== undefined) user.lastName = updateDto.lastName;

    // Update phone
    if (updateDto.phone && updateDto.phone !== user.phone) {
      user.phone = updateDto.phone;
      user.phoneVerified = updateDto.phoneVerified ?? false;
    }

    // Update verification status (if explicitly provided)
    if (updateDto.emailVerified !== undefined && updateDto.email === undefined) {
      user.emailVerified = updateDto.emailVerified;
    }
    if (updateDto.phoneVerified !== undefined && updateDto.phone === undefined) {
      user.phoneVerified = updateDto.phoneVerified;
    }

    // Update role (with validation)
    if (updateDto.role !== undefined) {
      // Prevent demoting the last super admin
      if (user.role === UserRole.SUPER_ADMIN && updateDto.role !== UserRole.SUPER_ADMIN) {
        const superAdminCount = await this.userRepository.count({
          where: { role: UserRole.SUPER_ADMIN },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException(
            'Cannot demote the last super admin',
          );
        }
      }
      user.role = updateDto.role;
    }

    // Update active status (with validation)
    if (updateDto.isActive !== undefined) {
      // Prevent deactivating super admins
      if (user.role === UserRole.SUPER_ADMIN && !updateDto.isActive) {
        throw new BadRequestException('Cannot deactivate super admin');
      }
      user.isActive = updateDto.isActive;
    }

    // Update profile fields
    if (updateDto.address !== undefined) user.address = updateDto.address;
    if (updateDto.city !== undefined) user.city = updateDto.city;
    if (updateDto.state !== undefined) user.state = updateDto.state;
    if (updateDto.zipCode !== undefined) user.zipCode = updateDto.zipCode;
    if (updateDto.country !== undefined) user.country = updateDto.country;
    if (updateDto.dateOfBirth !== undefined) {
      user.dateOfBirth = new Date(updateDto.dateOfBirth);
    }

    // Encrypt identification number if provided
    if (updateDto.identificationNumber !== undefined) {
      user.identificationNumber = updateDto.identificationNumber
        ? this.encryptionService.encrypt(updateDto.identificationNumber)
        : null;
    }

    const updated = await this.userRepository.save(user);
    this.logger.log(`✏️  User ${userId} updated by admin`);

    return updated;
  }

  /**
   * Get user statistics (admin)
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
    emailVerified: number;
    phoneVerified: number;
  }> {
    const all = await this.userRepository.find();

    const stats = {
      total: all.length,
      active: all.filter((u) => u.isActive).length,
      inactive: all.filter((u) => !u.isActive).length,
      byRole: {} as Record<UserRole, number>,
      emailVerified: all.filter((u) => u.emailVerified).length,
      phoneVerified: all.filter((u) => u.phoneVerified).length,
    };

    // Count by role
    Object.values(UserRole).forEach((role) => {
      stats.byRole[role] = all.filter((u) => u.role === role).length;
    });

    return stats;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate 6-digit OTP code
   */
  private generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Search users by email or name (admin)
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email ILIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName ILIKE :query', { query: `%${query}%` })
      .take(limit)
      .getMany();
  }
}
