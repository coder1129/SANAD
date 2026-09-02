import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'File category e.g. cv, certificate, portfolio',
    example: 'cv',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    description: 'Description or note for the uploaded file',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UploadDeliverableDto {
  @ApiPropertyOptional({
    description:
      'Deliverable type e.g. final_cv_pdf, final_cv_docx, cover_letter, linkedin_report',
    example: 'final_cv_pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deliverable_type?: string;

  @ApiPropertyOptional({
    description: 'Optional admin notes for the deliverable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
