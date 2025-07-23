import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Tank, FuelReading } from '@prisma/client'
import { Subject } from 'rxjs'

import { DatabaseService, SensorSimulationService } from './services'
import { FuelLevelEvent } from './entities'

@Injectable()
export class FuelTankService implements OnModuleInit {
  private readonly logger = new Logger(FuelTankService.name)
  private readonly fuelLevelUpdates = new Subject<FuelLevelEvent>()

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sensorSimulationService: SensorSimulationService,
  ) {}

  async onModuleInit() {
    await this.initializeAllTanks()
  }

  getFuelLevelUpdates() {
    return this.fuelLevelUpdates.asObservable()
  }

  async getAllTanks(): Promise<Tank[]> {
    return this.databaseService.getAllTanks()
  }

  async getTankById(id: string): Promise<Tank | null> {
    return this.databaseService.getTankById(id)
  }

  async getLatestReading(tankId: string): Promise<FuelReading | null> {
    return this.databaseService.getLatestReadingForTank(tankId)
  }

  async getAllLatestReadings(): Promise<FuelReading[]> {
    return this.databaseService.getAllLatestReadings()
  }

  @Cron('0 */30 * * * *')
  async performAutomatedReadings() {
    this.logger.log('Performing automated sensor readings for all tanks...')

    const tanks = await this.databaseService.getAllTanks()

    for (const tank of tanks) {
      await this.simulateAndProcessReading(tank)
    }

    this.logger.log(`Completed readings for ${tanks.length} tanks`)
  }

  private async initializeAllTanks() {
    const tanks = await this.databaseService.getAllTanks()

    for (const tank of tanks) {
      const existingReading =
        await this.databaseService.getLatestReadingForTank(tank.id)

      if (!existingReading) {
        const initialDistance =
          this.sensorSimulationService.getInitialFuelLevel(tank.height)
        const readingData = this.calculateFuelLevel(initialDistance, tank)

        const savedReading =
          await this.databaseService.addFuelReading(readingData)
        this.emitFuelLevelUpdate(tank, savedReading)

        this.logger.log(
          `Initialized tank ${tank.id} with initial fuel level: ${savedReading.fuelLevelPercentage.toFixed(1)}%`,
        )
      }
    }
  }

  private async simulateAndProcessReading(tank: Tank) {
    const latestReading = await this.databaseService.getLatestReadingForTank(
      tank.id,
    )
    const currentFuelHeight = latestReading
      ? latestReading.fuelHeight
      : tank.height * 0.5

    const simulatedDistance =
      this.sensorSimulationService.simulateSensorReading(
        tank.id,
        currentFuelHeight,
        tank.height,
      )
    const readingData = this.calculateFuelLevel(simulatedDistance, tank)
    const savedReading = await this.databaseService.addFuelReading(readingData)
    const significantChange =
      !latestReading ||
      Math.abs(
        savedReading.fuelLevelPercentage - latestReading.fuelLevelPercentage,
      ) > 0.1

    if (significantChange) {
      this.emitFuelLevelUpdate(tank, savedReading)
      this.logger.log(
        `Tank ${tank.id}: ${savedReading.fuelLevelPercentage.toFixed(1)}% ` +
          `(${savedReading.fuelLevelLiters.toFixed(0)}L) - Status: ${this.getFuelStatus(savedReading.fuelLevelPercentage)}`,
      )
    }
  }

  private calculateFuelLevel(
    distanceToFuel: number,
    tank: Tank,
  ): Omit<FuelReading, 'id' | 'timestamp'> {
    const distanceToFuelMeters = distanceToFuel / 100
    const fuelHeight = tank.sensorHeight - distanceToFuelMeters
    const actualFuelHeight = Math.max(0, Math.min(fuelHeight, tank.height))
    const fuelVolumeLiters = this.calculateCylindricalVolume(
      actualFuelHeight,
      tank.diameter,
    )

    const fuelLevelPercentage = (fuelVolumeLiters / tank.capacity) * 100

    return {
      tankId: tank.id,
      distanceToFuel: Math.round(distanceToFuel * 100) / 100,
      fuelLevelLiters: Math.round(fuelVolumeLiters * 100) / 100,
      fuelLevelPercentage: Math.round(fuelLevelPercentage * 100) / 100,
      fuelHeight: Math.round(actualFuelHeight * 1000) / 1000,
    }
  }

  private calculateCylindricalVolume(
    fuelHeight: number,
    diameter: number,
  ): number {
    const radius = diameter / 2
    const volume = Math.PI * Math.pow(radius, 2) * fuelHeight
    return volume * 1000
  }

  private emitFuelLevelUpdate(tank: Tank, reading: FuelReading) {
    const event: FuelLevelEvent = {
      type: 'fuel_level_update',
      data: {
        tankId: tank.id,
        tankName: tank.name,
        fuelLevelLiters: reading.fuelLevelLiters,
        fuelLevelPercentage: reading.fuelLevelPercentage,
        fuelHeight: reading.fuelHeight,
        distanceToFuel: reading.distanceToFuel,
        tankCapacity: tank.capacity,
        timestamp: reading.timestamp,
        status: this.getFuelStatus(reading.fuelLevelPercentage),
      },
    }

    this.fuelLevelUpdates.next(event)
  }

  private getFuelStatus(
    percentage: number,
  ): 'normal' | 'low' | 'critical' | 'full' {
    if (percentage >= 95) return 'full'
    if (percentage < 10) return 'critical'
    if (percentage < 25) return 'low'
    return 'normal'
  }

  async triggerManualReading(tankId: string) {
    const tank = await this.getTankById(tankId)
    if (!tank) {
      throw new Error(`Tank ${tankId} not found`)
    }

    await this.simulateAndProcessReading(tank)
    return this.getLatestReading(tankId)
  }
}
