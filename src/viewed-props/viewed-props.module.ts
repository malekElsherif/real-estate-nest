import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 🌟 1. استورد TypeOrmModule
import { ViewedPropsService } from './viewed-props.service';
import { ViewedPropsController } from './viewed-props.controller';
import { ViewedProp } from './entities/viewed-prop.entity'; // 🌟 2. استورد الـ Entity

@Module({
  imports: [
    TypeOrmModule.forFeature([ViewedProp]), // 🌟 3. أضفه هنا لكي يعمل الـ Repository داخل الـ Service
  ],
  controllers: [ViewedPropsController],
  providers: [ViewedPropsService],
})
export class ViewedPropsModule {}
