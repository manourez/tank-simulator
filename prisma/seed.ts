import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.fuelReading.deleteMany()
  await prisma.tank.deleteMany()

  const tanks = [
    {
      id: 'TANK-001',
      name: 'Main Storage Tank A',
      diameter: 2.5,
      height: 4.0,
      location: 'Building A - Ground Floor',
    },
    {
      id: 'TANK-002',
      name: 'Backup Storage Tank B',
      diameter: 2.0,
      height: 3.5,
      location: 'Building B - Basement',
    },
    {
      id: 'TANK-003',
      name: 'Emergency Reserve Tank',
      diameter: 1.8,
      height: 2.5,
      location: 'Emergency Bay',
    },
  ]

  for (const tankData of tanks) {
    const radius = tankData.diameter / 2
    const capacity = Math.PI * Math.pow(radius, 2) * tankData.height * 1000
    const tank = await prisma.tank.create({
      data: {
        id: tankData.id,
        name: tankData.name,
        diameter: tankData.diameter,
        height: tankData.height,
        capacity: Math.round(capacity),
        sensorHeight: tankData.height,
        location: tankData.location,
      },
    })

    const fullFuelHeight = tankData.height
    const distanceToFuel = 0
    const fuelLevelLiters = capacity
    const fuelLevelPercentage = 100

    await prisma.fuelReading.create({
      data: {
        tankId: tank.id,
        distanceToFuel: distanceToFuel,
        fuelLevelLiters: Math.round(fuelLevelLiters * 100) / 100,
        fuelLevelPercentage: fuelLevelPercentage,
        fuelHeight: fullFuelHeight,
        timestamp: new Date(),
      },
    })

    console.log(
      `✅ Created tank ${tank.id} (${tank.name}) - 100% full (${Math.round(fuelLevelLiters)}L)`,
    )
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
