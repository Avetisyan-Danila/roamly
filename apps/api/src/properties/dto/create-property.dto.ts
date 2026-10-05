import {
  ArrayUnique,
  IsArray,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Currency } from '../../generated/prisma/enums.js';

export class CreatePropertyDto {
  @IsString()
  @Length(3, 150)
  title: string;

  @IsString()
  @Length(10, 5000)
  description: string;

  @IsString()
  @Length(2, 100)
  country: string;

  @IsString()
  @Length(1, 100)
  city: string;

  @IsString()
  @Length(3, 300)
  address: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsDecimal({
    decimal_digits: '1,2',
    force_decimal: false,
  })
  @Matches(/^(?!0+(?:\.0{1,2})?$)\d{1,8}(?:\.\d{1,2})?$/)
  pricePerNight: string;

  @IsEnum(Currency)
  currency: Currency;

  @IsInt()
  @Min(1)
  maxGuests: number;

  @IsInt()
  @Min(0)
  bedrooms: number;

  @IsInt()
  @Min(1)
  beds: number;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  bathrooms: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  amenityIds?: string[];
}
