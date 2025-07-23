import { Injectable } from '@nestjs/common'

@Injectable()
export class SensorSimulationService {
  simulateSensorReading(
    tankId: string,
    currentFuelHeight: number,
    tankHeight: number,
  ): number {
    const scenario = this.determineScenario(
      tankId,
      currentFuelHeight,
      tankHeight,
    )

    return this.generateSensorReading(scenario, currentFuelHeight, tankHeight)
  }

  private determineScenario(
    tankId: string,
    currentFuelHeight: number,
    tankHeight: number,
  ): 'consumption' | 'refill' | 'stable' | 'emergency' {
    const fuelPercentage = (currentFuelHeight / tankHeight) * 100
    const random = Math.random()

    if (fuelPercentage < 10) {
      return random < 0.7 ? 'refill' : 'emergency'
    }

    if (fuelPercentage < 25) {
      return random < 0.6 ? 'refill' : 'consumption'
    }

    if (fuelPercentage > 75) {
      return random < 0.8 ? 'consumption' : 'stable'
    }

    if (random < 0.5) return 'consumption'
    if (random < 0.8) return 'stable'
    return 'refill'
  }

  private generateSensorReading(
    scenario: 'consumption' | 'refill' | 'stable' | 'emergency',
    currentFuelHeight: number,
    tankHeight: number,
  ): number {
    const sensorHeight = tankHeight
    let newFuelHeight = currentFuelHeight

    switch (scenario) {
      case 'consumption':
        newFuelHeight = Math.max(
          0,
          currentFuelHeight - (0.005 + Math.random() * 0.025),
        )
        break

      case 'refill':
        newFuelHeight = Math.min(
          tankHeight,
          currentFuelHeight + (0.02 + Math.random() * 0.08),
        )
        break

      case 'stable':
        const fluctuation = (Math.random() - 0.5) * 0.01
        newFuelHeight = Math.max(
          0,
          Math.min(tankHeight, currentFuelHeight + fluctuation),
        )
        break

      case 'emergency':
        newFuelHeight = Math.max(0, currentFuelHeight - Math.random() * 0.005)
        break
    }

    const distanceToFuel = (sensorHeight - newFuelHeight) * 100
    const noise = (Math.random() - 0.5) * 2

    return Math.max(0, Math.min(sensorHeight * 100, distanceToFuel + noise))
  }

  getInitialFuelLevel(tankHeight: number): number {
    const minPercentage = 20
    const maxPercentage = 80
    const percentage =
      minPercentage + Math.random() * (maxPercentage - minPercentage)

    const fuelHeight = (percentage / 100) * tankHeight
    const distanceToFuel = (tankHeight - fuelHeight) * 100

    return distanceToFuel
  }
}
