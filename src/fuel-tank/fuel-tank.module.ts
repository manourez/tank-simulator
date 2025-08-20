import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'
import { FuelTankController } from './fuel-tank.controller'
import { FuelTankService } from './fuel-tank.service'
import { DatabaseService } from './services/database.service'
import { SensorSimulationService } from './services/sensor-simulation.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [ScheduleModule.forRoot(), HttpModule, PrismaModule],
  controllers: [FuelTankController],
  providers: [FuelTankService, DatabaseService, SensorSimulationService],
  exports: [FuelTankService, DatabaseService],
})
export class FuelTankModule {}
