import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { AmenitiesModule } from './amenities/amenities.module.js';
import { validateEnv, type Env } from './config/env.validation.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { genRequestId } from './common/logging/request-id.js';
import { queryTagsMiddleware } from './common/logging/query-tags.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        assignResponse: true,
        pinoHttp: {
          level: configService.getOrThrow('LOG_LEVEL', { infer: true }),
          genReqId: genRequestId,
          serializers: {
            req: (req) => ({ id: req.id, method: req.method, url: req.url }),
            res: (res) => ({ statusCode: res.statusCode }),
          },
          customLogLevel: (_req, res, err) => {
            if (err || res.statusCode >= 500) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return 'info';
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    AmenitiesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(queryTagsMiddleware).forRoutes('{*splat}');
  }
}
