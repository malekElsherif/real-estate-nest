import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { PropertyImagesModule } from './property-images/property-images.module';
import { FavoritesModule } from './favorites/favorites.module';
import { RentalRequestsModule } from './rental-requests/rental-requests.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { ChatGateway } from './chat/chat.gateway';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /* TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        autoLoadEntities: true,

        synchronize: true,
      }),
      }),*/
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DB_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    UsersModule,
    PropertiesModule,
    PropertyImagesModule,
    FavoritesModule,
    RentalRequestsModule,
    PurchaseRequestsModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AdminModule,
    MessagesModule,
  ],

  controllers: [AppController],

  providers: [AppService, ChatGateway],
})
export class AppModule {}
