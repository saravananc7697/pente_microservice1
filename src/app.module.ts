import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RbacModule } from './rbac/rbac.module';
import { TeamManagementModule } from './team-management/team-management.module';
import { AdminAuthMiddleware } from './middleware/admin-auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    RbacModule,
    TypeOrmModule.forRoot({
      name: process.env.SQL_DB_CONNECTION_NAME || 'default',
      type: (process.env.SQL_DB_TYPE as any) || 'postgres',
      host: process.env.SQL_DB_HOST || 'localhost',
      port: Number(process.env.SQL_DB_PORT) || 5432,
      username: process.env.SQL_DB_USERNAME || 'postgres',
      password: process.env.SQL_DB_PASSWORD || 'admin',
      database: process.env.SQL_DB_DATABASE || 'pente_sites_admin',
      autoLoadEntities: true,
      synchronize: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_DB_URI || 'mongodb://localhost:27017/app_db',
      {
        connectionName: 'mongo',
      },
    ),
    TeamManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [TeamManagementModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminAuthMiddleware)
      .exclude
      // Add any routes you want to exclude from authentication
      // e.g., health checks, public endpoints
      // '/health',
      ()
      .forRoutes('*'); // Apply to all routes
  }
}
