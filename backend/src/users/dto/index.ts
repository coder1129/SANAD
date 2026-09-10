import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsIn,
  IsEmail,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CareerProfileDto {
  @IsOptional() @IsString() @MaxLength(255) target_job_title?: string;
  @IsOptional() @IsString() @MaxLength(255) target_industry?: string;
  @IsOptional() @IsString() @MaxLength(100) years_of_experience?: string;
  @IsOptional() @IsString() @MaxLength(500) education?: string;
  @IsOptional() @IsString() @MaxLength(1000) key_skills?: string;
  @IsOptional() @IsString() @MaxLength(500) linkedin_url?: string;
  @IsOptional() @IsString() @MaxLength(500) portfolio_url?: string;
  @IsOptional() @IsString() @MaxLength(255) target_country?: string;
  @IsOptional() @IsString() @MaxLength(2000) career_goals?: string;
}

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

  @ApiPropertyOptional({ type: CareerProfileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CareerProfileDto)
  career_profile?: CareerProfileDto;
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
