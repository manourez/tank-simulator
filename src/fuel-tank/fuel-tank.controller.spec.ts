import { Test, TestingModule } from '@nestjs/testing'
import { FuelTankController } from './fuel-tank.controller'
import { FuelTankService } from './fuel-tank.service'
import { Tank, FuelReading } from '@prisma/client'
import { of } from 'rxjs'

describe('FuelTankController', () => {
  let controller: FuelTankController
  let service: FuelTankService

  const mockTank: Tank = {
    id: 'TANK-001',
    name: 'Main Storage Tank A',
    stationId: 'STN-001',
    fuelType: 'Gasoline',
    capacity: 1000,
    isLow: false,
    temperature: 22.5,
    pression: 1.2,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockReading: FuelReading = {
    id: 'reading-1',
    tankId: 'TANK-001',
    distanceToFuel: 50.0,
    fuelLevelLiters: 15000.0,
    fuelLevelPercentage: 75.0,
    fuelHeight: 3.5,
    timestamp: new Date(),
  }

  const mockFuelTankService = {
    getAllTanks: jest.fn(),
    getTankById: jest.fn(),
    getLatestReading: jest.fn(),
    getAllLatestReadings: jest.fn(),
    triggerManualReading: jest.fn(),
    getFuelLevelUpdates: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FuelTankController],
      providers: [
        {
          provide: FuelTankService,
          useValue: mockFuelTankService,
        },
      ],
    }).compile()

    controller = module.get<FuelTankController>(FuelTankController)
    service = module.get<FuelTankService>(FuelTankService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getAllTanks', () => {
    it('should return an array of tanks', async () => {
      const tanks = [mockTank]
      mockFuelTankService.getAllTanks.mockResolvedValue(tanks)

      const result = await controller.getAllTanks()

      expect(result).toEqual(tanks)
      expect(service.getAllTanks).toHaveBeenCalled()
    })
  })

  describe('getTankById', () => {
    it('should return a tank by id', async () => {
      mockFuelTankService.getTankById.mockResolvedValue(mockTank)

      const result = await controller.getTankById('TANK-001')

      expect(result).toEqual(mockTank)
      expect(service.getTankById).toHaveBeenCalledWith('TANK-001')
    })

    it('should throw error if tank not found', async () => {
      mockFuelTankService.getTankById.mockResolvedValue(null)

      await expect(controller.getTankById('NON-EXISTENT')).rejects.toThrow(
        'Tank NON-EXISTENT not found',
      )
    })
  })

  describe('getLatestReading', () => {
    it('should return latest reading for a tank', async () => {
      mockFuelTankService.getLatestReading.mockResolvedValue(mockReading)

      const result = await controller.getLatestReading('TANK-001')

      expect(result).toEqual(mockReading)
      expect(service.getLatestReading).toHaveBeenCalledWith('TANK-001')
    })

    it('should throw error if no readings found', async () => {
      mockFuelTankService.getLatestReading.mockResolvedValue(null)

      await expect(controller.getLatestReading('TANK-001')).rejects.toThrow(
        'No readings found for tank TANK-001',
      )
    })
  })

  describe('getAllLatestReadings', () => {
    it('should return all latest readings', async () => {
      const readings = [mockReading]
      mockFuelTankService.getAllLatestReadings.mockResolvedValue(readings)

      const result = await controller.getAllLatestReadings()

      expect(result).toEqual(readings)
      expect(service.getAllLatestReadings).toHaveBeenCalled()
    })
  })

  describe('triggerManualReading', () => {
    it('should trigger manual reading and return result', async () => {
      mockFuelTankService.triggerManualReading.mockResolvedValue(mockReading)

      const result = await controller.triggerManualReading('TANK-001')

      expect(result).toEqual(mockReading)
      expect(service.triggerManualReading).toHaveBeenCalledWith('TANK-001')
    })

    it('should throw error if reading generation fails', async () => {
      mockFuelTankService.triggerManualReading.mockResolvedValue(null)

      await expect(controller.triggerManualReading('TANK-001')).rejects.toThrow(
        'Failed to generate reading for tank TANK-001',
      )
    })
  })

  describe('streamFuelLevels', () => {
    it('should return fuel level updates stream', () => {
      const mockEvent = {
        type: 'fuel_level_update',
        data: {
          tankId: 'TANK-001',
          tankName: 'Main Storage Tank A',
          fuelLevelLiters: 15000,
          fuelLevelPercentage: 75,
          fuelHeight: 3.5,
          distanceToFuel: 50,
          tankCapacity: 19635,
          timestamp: new Date(),
          status: 'normal' as const,
        },
      }

      mockFuelTankService.getFuelLevelUpdates.mockReturnValue(of(mockEvent))

      const result = controller.streamFuelLevels()

      expect(result).toBeDefined()
      expect(service.getFuelLevelUpdates).toHaveBeenCalled()
    })
  })
})
