import { Injectable } from '@nestjs/common'
import { Tank, FuelReading } from '@prisma/client'

import { PrismaService } from '../../prisma'

@Injectable()
export class DatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  async getTankById(id: string): Promise<Tank | null> {
    return this.prisma.tank.findUnique({
      where: { id },
    })
  }

  async getAllTanks(): Promise<Tank[]> {
    return this.prisma.tank.findMany({
      orderBy: { createdAt: 'asc' },
    })
  }

  async addFuelReading(
    reading: Omit<FuelReading, 'id' | 'timestamp'>,
  ): Promise<FuelReading> {
    return this.prisma.fuelReading.create({
      data: reading,
    })
  }

  async getLatestReadingForTank(tankId: string): Promise<FuelReading | null> {
    return this.prisma.fuelReading.findFirst({
      where: { tankId },
      orderBy: { timestamp: 'desc' },
    })
  }

  async getReadingsForTank(
    tankId: string,
    limit: number = 50,
  ): Promise<FuelReading[]> {
    return this.prisma.fuelReading.findMany({
      where: { tankId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  }

  async getAllLatestReadings(): Promise<FuelReading[]> {
    const tanks = await this.getAllTanks()
    const latestReadings: FuelReading[] = []

    for (const tank of tanks) {
      const latest = await this.getLatestReadingForTank(tank.id)
      if (latest) {
        latestReadings.push(latest)
      }
    }

    return latestReadings
  }

  async cleanupOldReadings(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.prisma.fuelReading.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    })

    return result.count
  }
}
