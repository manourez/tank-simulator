import { Controller, Get, Post, Param, Sse, MessageEvent } from '@nestjs/common'
import { Tank, FuelReading } from '@prisma/client'
import { Observable, map } from 'rxjs'

import { FuelLevelEvent } from './entities'
import { FuelTankService } from './fuel-tank.service'

@Controller('fuel-tank')
export class FuelTankController {
  constructor(private readonly fuelTankService: FuelTankService) {}

  @Sse('events')
  streamFuelLevels(): Observable<MessageEvent> {
    return this.fuelTankService.getFuelLevelUpdates().pipe(
      map((event: FuelLevelEvent) => ({
        type: event.type,
        data: JSON.stringify(event.data),
      })),
    )
  }

  @Get('tanks')
  async getAllTanks(): Promise<Tank[]> {
    return this.fuelTankService.getAllTanks()
  }

  @Get('tanks/:id')
  async getTankById(@Param('id') id: string): Promise<Tank> {
    const tank = await this.fuelTankService.getTankById(id)
    if (!tank) {
      throw new Error(`Tank ${id} not found`)
    }
    return tank
  }

  @Get('tanks/:id/latest')
  async getLatestReading(@Param('id') tankId: string): Promise<FuelReading> {
    const reading = await this.fuelTankService.getLatestReading(tankId)
    if (!reading) {
      throw new Error(`No readings found for tank ${tankId}`)
    }
    return reading
  }

  @Get('latest')
  async getAllLatestReadings(): Promise<FuelReading[]> {
    return this.fuelTankService.getAllLatestReadings()
  }

  @Post('tanks/:id/trigger-reading')
  async triggerManualReading(
    @Param('id') tankId: string,
  ): Promise<FuelReading> {
    const reading = await this.fuelTankService.triggerManualReading(tankId)
    if (!reading) {
      throw new Error(`Failed to generate reading for tank ${tankId}`)
    }
    return reading
  }
}
