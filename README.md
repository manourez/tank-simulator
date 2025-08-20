# 🛢️ Fuel Tank Simulator

A production-ready NestJS fuel tank monitoring system with **Prisma ORM**, SQLite database, automated sensor readings, real-time updates via Server-Sent Events (SSE), and comprehensive monitoring capabilities.

## ✨ Features

### 🔄 **Automated Sensor Readings**

- **Scheduled readings every 30 minutes** using NestJS Scheduler
- **Realistic fuel consumption simulation** with different scenarios:
  - Normal consumption patterns
  - Refilling events
  - Emergency low-fuel situations
  - Tank capacity constraints

### 📊 **Real-time Monitoring**

- **Server-Sent Events (SSE)** for live fuel level updates
- **Real-time web dashboard** with visual fuel level indicators
- **Status-based color coding**: Normal (Green), Low (Orange), Critical (Red), Full (Blue)
- **Connection status monitoring** with automatic reconnection

### 🗄️ **Database Integration**

- **Prisma ORM** with SQLite database
- **Tank management by ID** with persistent storage
- **Historical readings storage** with database relationships
- **Cylindrical tank focus** as requested

### 🎯 **Production Ready**

- **Error handling and validation**
- **Comprehensive logging**
- **CORS enabled** for web client integration
- **Database migrations** with Prisma
- **TypeScript** with full type safety
- **Unit and E2E testing**

## 🏗️ **Architecture**

```
src/
├── fuel-tank/
│   ├── services/
│   │   ├── database.service.ts         # Prisma-based database operations
│   │   └── sensor-simulation.service.ts # Realistic sensor reading simulation
│   ├── fuel-tank.controller.ts       # REST API and SSE endpoints
│   ├── fuel-tank.service.ts          # Core business logic
│   └── fuel-tank.module.ts           # NestJS module configuration
├── prisma/
│   ├── prisma.service.ts              # Prisma client service
│   └── prisma.module.ts               # Prisma module
├── app.module.ts                      # Main app with ScheduleModule
└── main.ts                           # Bootstrap configuration

prisma/
├── schema.prisma                      # Database schema definition
└── dev.db                            # SQLite database file
```

## 🚀 **API Endpoints**

### **Real-time Events**

- `GET /fuel-tank/events` - **Server-Sent Events** stream for live updates

### **Tank Management**

- `GET /fuel-tank/tanks` - Get all tanks
- `GET /fuel-tank/tanks/:id` - Get specific tank by ID
- `GET /fuel-tank/tanks/:id/latest` - Get latest reading for a tank

### **Readings**

- `GET /fuel-tank/latest` - Get latest readings for all tanks
- `POST /fuel-tank/tanks/:id/trigger-reading` - Manual reading trigger (testing)

### **System**

- `GET /health` - Health check endpoint

## **Installation & Setup**

### **Prerequisites**

- Node.js 18+
- pnpm (recommended) or npm

### **Install Dependencies**

```bash
pnpm install
```

### **Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### **Start Development Server**

```bash
pnpm run start:dev
```

The server will start on **port 3002** and automatically:

1. ✅ Connect to SQLite database via Prisma
2. ✅ Load tanks from database
3. ✅ Begin automated readings every 30 minutes
4. ✅ Start SSE stream for real-time updates

### **Database Management**

```bash
# View database in browser
npx prisma studio

# Reset database (use with caution)
npx prisma migrate reset --force
```

## 📱 **Web Dashboard**

Open `test-sse.html` in your browser to see:

- **Real-time fuel level visualization** with progress bars
- **Live connection status** indicator
- **Color-coded tank statuses** (Normal/Low/Critical/Full)
- **Detailed tank information** (volume, height, capacity, location)
- **Live updates log** with timestamps
- **Professional tank monitoring interface**

## 📡 **Server-Sent Events Usage**

### **JavaScript Client Example**

```javascript
const eventSource = new EventSource('http://localhost:3002/fuel-tank/events')

eventSource.addEventListener('fuel_level_update', function (event) {
  const data = JSON.parse(event.data)

  console.log(`Tank ${data.tankName}: ${data.fuelLevelPercentage}%`)
  console.log(`Status: ${data.status}`)
  console.log(`Volume: ${data.fuelLevelLiters}L`)
})
```

### **Event Data Structure**

```json
{
  "type": "fuel_level_update",
  "data": {
    "tankId": "TANK-001",
    "tankName": "Main Storage Tank A",
    "fuelLevelLiters": 10891.03,
    "fuelLevelPercentage": 55.47,
    "fuelHeight": 2.219,
    "distanceToFuel": 178.13,
    "tankCapacity": 19635,
    "timestamp": "2025-07-23T16:03:01.799Z",
    "status": "normal"
  }
}
```

## 🧮 **Fuel Calculation**

**For Cylindrical Tanks:**

- **Formula**: `Volume = π × r² × fuel_height`
- **Conversion**: `Cubic meters → Liters (×1000)`
- **Percentage**: `(Current Volume / Total Capacity) × 100`

**Sensor Logic:**

- **Distance Measurement**: Sensor at tank top measures distance to fuel surface
- **Fuel Height**: `Tank Height - Sensor Distance`
- **Bounds Checking**: Ensures fuel height ≥ 0 and ≤ tank height

## 🤖 **Sensor Simulation**

The system simulates realistic scenarios:

### **Consumption Patterns**

- **Normal**: 0.5-3cm fuel decrease per reading
- **Emergency**: Minimal consumption when fuel < 10%

### **Refilling Events**

- **Triggered**: When fuel < 25% (60% probability)
- **Amount**: 2-10cm fuel increase per reading

### **Sensor Accuracy**

- **Noise**: ±1cm random variation
- **Precision**: Rounded to 0.01cm

## 🔍 **Testing**

### **Run Unit Tests**

```bash
pnpm run test
```

### **Run E2E Tests**

```bash
pnpm run test:e2e
```

### **Test Coverage**

```bash
pnpm run test:cov
```

### **Manual API Testing**

```bash
# Get all tanks
curl http://localhost:3002/fuel-tank/tanks

# Get specific tank
curl http://localhost:3002/fuel-tank/tanks/TANK-001

# Get latest readings
curl http://localhost:3002/fuel-tank/latest

# Get latest reading for specific tank
curl http://localhost:3002/fuel-tank/tanks/TANK-001/latest

# Trigger manual reading
curl -X POST http://localhost:3002/fuel-tank/tanks/TANK-001/trigger-reading

# Test SSE (keep connection open)
curl -N http://localhost:3002/fuel-tank/events
```

### **Database Testing**

```bash
# View data in Prisma Studio
npx prisma studio

# Check database tables
sqlite3 prisma/dev.db ".tables"

# Query tanks
sqlite3 prisma/dev.db "SELECT * FROM Tank;"

# Query readings
sqlite3 prisma/dev.db "SELECT * FROM FuelReading ORDER BY timestamp DESC LIMIT 10;"
```

## 📝 **Logs**

The system provides comprehensive logging:

- ✅ **Database connection** and Prisma client initialization
- ✅ **Tank loading** from database on startup
- 🔄 **Automated reading cycles** (every 30 minutes)
- 📊 **Significant fuel level changes** (>0.1% difference)
- ⚠️ **Status changes** (Normal → Low → Critical → Full)
- 💾 **Database operations** (readings saved, cleanup)

### **Sample Log Output**

```
[NestApplication] Starting Nest application...
[InstanceLoader] PrismaModule dependencies initialized
[FuelTankService] Performing automated sensor readings for all tanks...
[FuelTankService] Tank TANK-001: 99.5% (19541L) - Status: full
[FuelTankService] Tank TANK-002: 98.8% (10865L) - Status: full
[FuelTankService] Tank TANK-003: 99.2% (6312L) - Status: full
[FuelTankService] Completed readings for 3 tanks
```

## 🗄️ **Database Schema**

### **Tank Model**

```prisma
model Tank {
  id           String        @id
  name         String
  diameter     Float
  height       Float
  capacity     Int
  sensorHeight Float
  location     String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  readings     FuelReading[] // One-to-many relationship
}
```

### **FuelReading Model**

```prisma
model FuelReading {
  id                   String   @id @default(cuid())
  tankId               String
  distanceToFuel       Float
  fuelLevelLiters      Float
  fuelLevelPercentage  Float
  fuelHeight           Float
  timestamp            DateTime @default(now())
  tank                 Tank     @relation(fields: [tankId], references: [id], onDelete: Cascade)

  @@index([tankId])
  @@index([timestamp])
}
```

## 🔮 **Future Enhancements**

- **Database Scaling**: PostgreSQL support for production environments
- **Authentication**: Add JWT-based authentication for API endpoints
- **Tank Configuration**: Dynamic tank creation and modification APIs
- **Alerts**: Email/SMS notifications for critical fuel levels
- **Historical Analytics**: Fuel consumption trends and predictions
- **Mobile App**: React Native app for mobile monitoring
- **Multi-tenant**: Support for multiple facilities/organizations
- **Advanced Sensors**: Support for different tank shapes (rectangular, spherical)

## 🤝 **Built With**

- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework
- **[Prisma ORM](https://www.prisma.io/)** - Modern database toolkit
- **[SQLite](https://www.sqlite.org/)** - Lightweight database engine
- **[NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)** - Cron-based task scheduling
- **[RxJS](https://rxjs.dev/)** - Reactive programming for SSE
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **Server-Sent Events** - Real-time browser communication
- **Jest** - Testing framework

## 📦 **Package Scripts**

```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/main",
  "build": "nest build",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "db:studio": "prisma studio",
  "db:generate": "prisma generate",
  "db:push": "prisma db push"
}
```

---

**🚀 Ready for production fuel tank monitoring with Prisma ORM and SQLite!**
