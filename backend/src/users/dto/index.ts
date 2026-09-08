import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsIn,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'عبدالله محمد' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Abdallah' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Ahmed' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @ApiPropertyOptional({ example: '+971501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female'])
  gender?: string;
}

export class CreateAdministratorDto {
  @IsString() @MinLength(2) @MaxLength(255) name!: string;
  @IsEmail() @MaxLength(255) email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsIn(['admin', 'super_admin']) role!: 'admin' | 'super_admin';
}

export class UpdateAdministratorDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) name?: string;
  @IsOptional() @IsIn(['admin', 'super_admin']) role?: 'admin' | 'super_admin';
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ResetAdministratorPasswordDto {
  @IsString() @MinLength(12) password!: string;
}
