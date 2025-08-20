export interface Tank {
  id: string
  name: string
  stationId: string
  fuelType: string
  isLow: boolean
  temperature: number
  pression: number
  createdAt: Date
  updatedAt: Date
  fuelReadings: FuelReading[]
}

export interface FuelReading {
  id: string
  tankId: string
  distanceToFuel: number
  fuelLevelLiters: number
  fuelLevelPercentage: number
  fuelHeight: number
  timestamp: Date
}

interface FuelEventData {
  tankId: string
  tankName: string
  fuelLevelLiters: number
  fuelLevelPercentage: number
  fuelHeight: number
  distanceToFuel: number
  tankCapacity: number
  timestamp: Date
  status: 'normal' | 'low' | 'critical' | 'full'
  stationId: string
  fuelType: string
  temperature: number
  pression: number
  isLow: boolean
}

export interface FuelLevelEvent {
  type: 'fuel_level_update'
  data: FuelEventData
}
