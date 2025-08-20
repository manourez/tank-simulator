import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Tank, FuelReading } from '@prisma/client'
import { HttpService } from '@nestjs/axios'
import { BehaviorSubject, Subject } from 'rxjs'
import { AxiosResponse } from 'axios'

import { DatabaseService, SensorSimulationService } from './services'
import { FuelLevelEvent } from './entities'

@Injectable()
export class FuelTankService implements OnModuleInit {
  private readonly logger = new Logger(FuelTankService.name)
  private readonly fuelLevelUpdates = new Subject<FuelLevelEvent>()
  private connectionStatus = new BehaviorSubject<boolean>(false)
  private eventSubject = new Subject<string>()
  private reconnectInterval = 5000
  private reconnectTimer?: NodeJS.Timeout
  private abortController?: AbortController
  private readonly sseUrl: string

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sensorSimulationService: SensorSimulationService,
    private readonly httpService: HttpService,
  ) {
    this.sseUrl = 'http://localhost:3000/api/tank/create'
  }

  async onModuleInit() {
    await this.initializeAllTanks()
    await this.connectToSSE()
  }

  async connectToSSE(): Promise<void> {
    if (this.connectionStatus.value) {
      this.logger.warn('Already connected to SSE')
      return
    }

    try {
      this.abortController = new AbortController()
      this.logger.log(`Connecting to SSE endpoint: ${this.sseUrl}`)

      const response = await this.httpService.axiosRef({
        method: 'GET',
        url: this.sseUrl,
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        responseType: 'stream',
        signal: this.abortController.signal,
        timeout: 0,
      })

      this.handleSSEConnection(response)
    } catch (error) {
      this.handleConnectionError(error)
    }
  }

  private handleSSEConnection(response: AxiosResponse) {
    this.connectionStatus.next(true)
    this.logger.log('Successfully connected to SSE endpoint')

    const stream = response.data
    let buffer = ''

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      const filteredLines = lines.filter((line) => line !== '')

      const jsonData = filteredLines.reduce(
        (acc, line) => {
          const [key, value] = line.split(': ')
          if (key && value) {
            acc[key] = value
          }
          return acc
        },
        {} as Record<string, string>,
      )

      this.processSSELines(JSON.stringify(jsonData))
    })

    stream.on('end', () => {
      this.logger.warn('SSE connection ended')
      this.connectionStatus.next(false)
      this.scheduleReconnect()
    })

    stream.on('error', (error: Error) => {
      this.logger.error('SSE stream error:', error.message)
      this.connectionStatus.next(false)
      this.scheduleReconnect()
    })
  }

  private processSSELines(event: string) {
    this.eventSubject.next(event)
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.logger.log(`Scheduling reconnection in ${this.reconnectInterval}ms`)
    this.reconnectTimer = setTimeout(() => {
      this.connectToSSE()
    }, this.reconnectInterval)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }

    this.connectionStatus.next(false)
    this.logger.log('Disconnected from SSE')
  }

  private handleConnectionError(error: any) {
    this.connectionStatus.next(false)

    if (error.name === 'AbortError') {
      this.logger.log('SSE connection aborted')
      return
    }

    if (error.code === 'ECONNREFUSED') {
      this.logger.error(
        `Cannot connect to SSE endpoint at ${this.sseUrl}. Server might be down.`,
      )
    } else if (error.response?.status) {
      this.logger.error(
        `SSE connection failed with status ${error.response.status}: ${error.response.statusText}`,
      )
    } else {
      this.logger.error(`SSE connection error: ${error.message}`)
    }

    this.scheduleReconnect()
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
        // Initialize with a random fuel level between 20-80%
        const initialFuelPercentage = 20 + Math.random() * 60
        const readingData = this.createFuelReading(tank, initialFuelPercentage)

        const savedReading =
          await this.databaseService.addFuelReading(readingData)
        this.emitFuelLevelUpdate(tank, savedReading)

        this.logger.log(
          `Initialized tank ${tank.id} (${tank.name}) with initial fuel level: ${savedReading.fuelLevelPercentage.toFixed(1)}%`,
        )
      }
    }
  }

  private async simulateAndProcessReading(tank: Tank) {
    const latestReading = await this.databaseService.getLatestReadingForTank(
      tank.id,
    )

    // Simulate fuel consumption/addition (±0.5% to ±2% change)
    const changeDirection = Math.random() > 0.7 ? 1 : -1 // 30% chance to increase (refuel), 70% to decrease (consumption)
    const changeAmount = (Math.random() * 1.5 + 0.5) * changeDirection

    const currentPercentage = latestReading
      ? latestReading.fuelLevelPercentage
      : 50
    const newPercentage = Math.max(
      0,
      Math.min(100, currentPercentage + changeAmount),
    )

    const readingData = this.createFuelReading(tank, newPercentage)
    const savedReading = await this.databaseService.addFuelReading(readingData)

    const significantChange =
      !latestReading ||
      Math.abs(
        savedReading.fuelLevelPercentage - latestReading.fuelLevelPercentage,
      ) > 0.1

    if (significantChange) {
      this.emitFuelLevelUpdate(tank, savedReading)
      this.logger.log(
        `Tank ${tank.id} (${tank.name}): ${savedReading.fuelLevelPercentage.toFixed(1)}% ` +
          `(${savedReading.fuelLevelLiters.toFixed(0)}L) - Status: ${this.getFuelStatus(savedReading.fuelLevelPercentage)}`,
      )
    }
  }

  private createFuelReading(
    tank: Tank,
    fuelPercentage: number,
  ): Omit<FuelReading, 'id' | 'timestamp'> {
    // For the new schema, we'll use standard tank assumptions
    // Since we don't have physical dimensions, we'll use reasonable defaults
    const estimatedCapacity = 1000 // Default 1000L capacity
    const estimatedHeight = 2.0 // Default 2m height

    const fuelLevelLiters = (fuelPercentage / 100) * estimatedCapacity
    const fuelHeight = (fuelPercentage / 100) * estimatedHeight
    const distanceToFuel = estimatedHeight - fuelHeight

    return {
      tankId: tank.id,
      distanceToFuel: Math.round(distanceToFuel * 100) / 100,
      fuelLevelLiters: Math.round(fuelLevelLiters * 100) / 100,
      fuelLevelPercentage: Math.round(fuelPercentage * 100) / 100,
      fuelHeight: Math.round(fuelHeight * 1000) / 1000,
    }
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
        tankCapacity: 1000, // Using default capacity
        timestamp: reading.timestamp,
        status: this.getFuelStatus(reading.fuelLevelPercentage),
        stationId: tank.stationId,
        fuelType: tank.fuelType,
        temperature: tank.temperature,
        pression: tank.pression,
        isLow: tank.isLow || reading.fuelLevelPercentage < 25,
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
