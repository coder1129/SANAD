import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsIn,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'عبدالله محمد' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+971501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'A-Unique-Strong-Passphrase-2026' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MaxLength(128)
  password!: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Legacy fallback. Browser clients use the HttpOnly refresh-token cookie.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  token!: string;

  @ApiProperty({ example: 'A-New-Unique-Passphrase-2026' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'A-New-Unique-Passphrase-2026' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the verification email link' })
  @IsString()
  @MaxLength(128)
  token!: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class PasswordlessRequestDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    enum: ['sign_in', 'sign_up'],
    description: 'Explicit customer authentication flow',
  })
  @IsOptional()
  @IsIn(['sign_in', 'sign_up'])
  flow?: 'sign_in' | 'sign_up';
}

export class PasswordlessVerifyDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiPropertyOptional({
    enum: ['sign_in', 'sign_up'],
    description: 'Explicit customer authentication flow',
  })
  @IsOptional()
  @IsIn(['sign_in', 'sign_up'])
  flow?: 'sign_in' | 'sign_up';
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google Identity Services ID token' })
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  credential!: string;

  @ApiProperty({ enum: ['sign_in', 'sign_up'] })
  @IsIn(['sign_in', 'sign_up'])
  flow!: 'sign_in' | 'sign_up';
}

export class PasswordlessCompleteProfileDto {
  @ApiProperty()
  @IsString()
  registrationToken!: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '+971501234567' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'male', enum: ['male', 'female'] })
  @IsIn(['male', 'female'])
  gender!: 'male' | 'female';
}
