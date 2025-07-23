export interface Tank {
  id: string
  name: string
  diameter: number
  height: number
  capacity: number
  sensorHeight: number
  location?: string
  createdAt: Date
  updatedAt: Date
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
}

export interface FuelLevelEvent {
  type: 'fuel_level_update'
  data: FuelEventData
}
