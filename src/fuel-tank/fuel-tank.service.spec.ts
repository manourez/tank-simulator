import { Test, TestingModule } from '@nestjs/testing'
import { ScheduleModule } from '@nestjs/schedule'
import { FuelTankService } from './fuel-tank.service'
import { DatabaseService } from './services/database.service'
import { SensorSimulationService } from './services/sensor-simulation.service'
import { PrismaService } from '../prisma/prisma.service'
import { Tank } from '@prisma/client'

// Mock PrismaService
const mockPrismaService = {
  tank: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  fuelReading: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

// Mock DatabaseService
const mockDatabaseService = {
  getTankById: jest.fn(),
  getAllTanks: jest.fn().mockResolvedValue([]), // Default empty array
  addFuelReading: jest.fn(),
  getLatestReadingForTank: jest.fn(),
  getAllLatestReadings: jest.fn(),
}

describe('FuelTankService', () => {
  let service: FuelTankService
  let databaseService: DatabaseService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        FuelTankService,
        SensorSimulationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<FuelTankService>(FuelTankService)
    databaseService = module.get<DatabaseService>(DatabaseService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getAllTanks', () => {
    it('should return all tanks', async () => {
      const mockTanks: Tank[] = [
        {
          id: 'TANK-001',
          name: 'Main Storage Tank A',
          diameter: 2.5,
          height: 4.0,
          capacity: 19635,
          sensorHeight: 4.0,
          location: 'Building A - Ground Floor',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDatabaseService.getAllTanks.mockResolvedValue(mockTanks)

      const result = await service.getAllTanks()
      expect(result).toEqual(mockTanks)
      expect(databaseService.getAllTanks).toHaveBeenCalled()
    })
  })

  describe('getTankById', () => {
    it('should return tank by id', async () => {
      const mockTank: Tank = {
        id: 'TANK-001',
        name: 'Main Storage Tank A',
        diameter: 2.5,
        height: 4.0,
        capacity: 19635,
        sensorHeight: 4.0,
        location: 'Building A - Ground Floor',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDatabaseService.getTankById.mockResolvedValue(mockTank)

      const result = await service.getTankById('TANK-001')
      expect(result).toEqual(mockTank)
      expect(databaseService.getTankById).toHaveBeenCalledWith('TANK-001')
    })

    it('should return null for non-existent tank', async () => {
      mockDatabaseService.getTankById.mockResolvedValue(null)

      const result = await service.getTankById('NON-EXISTENT')
      expect(result).toBeNull()
      expect(databaseService.getTankById).toHaveBeenCalledWith('NON-EXISTENT')
    })
  })

  describe('triggerManualReading', () => {
    it('should trigger manual reading for existing tank', async () => {
      const mockTank: Tank = {
        id: 'TANK-001',
        name: 'Main Storage Tank A',
        diameter: 2.5,
        height: 4.0,
        capacity: 19635,
        sensorHeight: 4.0,
        location: 'Building A - Ground Floor',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReading = {
        id: 'reading-1',
        tankId: 'TANK-001',
        distanceToFuel: 50.0,
        fuelLevelLiters: 15000.0,
        fuelLevelPercentage: 75.0,
        fuelHeight: 3.5,
        timestamp: new Date(),
      }

      mockDatabaseService.getTankById.mockResolvedValue(mockTank)
      mockDatabaseService.getLatestReadingForTank.mockResolvedValue(mockReading)
      mockDatabaseService.addFuelReading.mockResolvedValue(mockReading)

      const result = await service.triggerManualReading('TANK-001')
      expect(result).toEqual(mockReading)
      expect(databaseService.getTankById).toHaveBeenCalledWith('TANK-001')
    })

    it('should throw error for non-existent tank', async () => {
      mockDatabaseService.getTankById.mockResolvedValue(null)

      await expect(
        service.triggerManualReading('NON-EXISTENT'),
      ).rejects.toThrow('Tank NON-EXISTENT not found')
    })
  })

  describe('cylindrical volume calculation', () => {
    it('should calculate cylindrical volume correctly', () => {
      // Access private method through type assertion for testing
      const privateService = service as any

      // Test cylindrical volume calculation
      // Volume = π × r² × height
      // For diameter 2m, radius = 1m, height = 3m
      // Volume = π × 1² × 3 = 3π ≈ 9.42 cubic meters = 9420 liters

      const volume = privateService.calculateCylindricalVolume(3.0, 2.0)
      expect(volume).toBeCloseTo(9424.78, 1)
    })

    it('should handle zero height', () => {
      const privateService = service as any
      const volume = privateService.calculateCylindricalVolume(0, 2.0)
      expect(volume).toBe(0)
    })
  })

  describe('fuel status determination', () => {
    it('should return correct fuel status', () => {
      const privateService = service as any

      expect(privateService.getFuelStatus(100)).toBe('full')
      expect(privateService.getFuelStatus(95)).toBe('full')
      expect(privateService.getFuelStatus(50)).toBe('normal')
      expect(privateService.getFuelStatus(25)).toBe('normal')
      expect(privateService.getFuelStatus(15)).toBe('low')
      expect(privateService.getFuelStatus(5)).toBe('critical')
      expect(privateService.getFuelStatus(0)).toBe('critical')
    })
  })
})
