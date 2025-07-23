import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from './../src/app.module'

describe('Tank Simulator (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Authorization',
    })

    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('/fuel-tank', () => {
    it('/fuel-tank/tanks (GET) should return all tanks', () => {
      return request(app.getHttpServer())
        .get('/fuel-tank/tanks')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true)
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id')
            expect(res.body[0]).toHaveProperty('name')
            expect(res.body[0]).toHaveProperty('diameter')
            expect(res.body[0]).toHaveProperty('height')
            expect(res.body[0]).toHaveProperty('capacity')
          }
        })
    })

    it('/fuel-tank/latest (GET) should return latest fuel readings', () => {
      return request(app.getHttpServer())
        .get('/fuel-tank/latest')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true)
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('tankId')
            expect(res.body[0]).toHaveProperty('fuelLevelLiters')
            expect(res.body[0]).toHaveProperty('fuelLevelPercentage')
            expect(res.body[0]).toHaveProperty('timestamp')
          }
        })
    })

    it('/fuel-tank/tanks/:id (GET) should return tank by id', async () => {
      // First get all tanks to find a valid ID
      const tanksResponse = await request(app.getHttpServer())
        .get('/fuel-tank/tanks')
        .expect(200)

      if (tanksResponse.body.length > 0) {
        const tankId = tanksResponse.body[0].id

        return request(app.getHttpServer())
          .get(`/fuel-tank/tanks/${tankId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', tankId)
            expect(res.body).toHaveProperty('name')
            expect(res.body).toHaveProperty('diameter')
            expect(res.body).toHaveProperty('height')
          })
      }
    })

    it('/fuel-tank/tanks/:id/latest (GET) should return latest reading for tank', async () => {
      // First get all tanks to find a valid ID
      const tanksResponse = await request(app.getHttpServer())
        .get('/fuel-tank/tanks')
        .expect(200)

      if (tanksResponse.body.length > 0) {
        const tankId = tanksResponse.body[0].id

        return request(app.getHttpServer())
          .get(`/fuel-tank/tanks/${tankId}/latest`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('tankId', tankId)
            expect(res.body).toHaveProperty('fuelLevelLiters')
            expect(res.body).toHaveProperty('fuelLevelPercentage')
            expect(res.body).toHaveProperty('timestamp')
          })
      }
    })

    it('/fuel-tank/tanks/:id/trigger-reading (POST) should trigger manual reading', async () => {
      // First get all tanks to find a valid ID
      const tanksResponse = await request(app.getHttpServer())
        .get('/fuel-tank/tanks')
        .expect(200)

      if (tanksResponse.body.length > 0) {
        const tankId = tanksResponse.body[0].id

        return request(app.getHttpServer())
          .post(`/fuel-tank/tanks/${tankId}/trigger-reading`)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('tankId', tankId)
            expect(res.body).toHaveProperty('fuelLevelLiters')
            expect(res.body).toHaveProperty('fuelLevelPercentage')
            expect(res.body).toHaveProperty('timestamp')
            expect(typeof res.body.fuelLevelPercentage).toBe('number')
            expect(res.body.fuelLevelPercentage).toBeGreaterThanOrEqual(0)
            expect(res.body.fuelLevelPercentage).toBeLessThanOrEqual(100)
          })
      }
    })

    it('/fuel-tank/tanks/NON-EXISTENT (GET) should return 500 for non-existent tank', () => {
      return request(app.getHttpServer())
        .get('/fuel-tank/tanks/NON-EXISTENT')
        .expect(500)
    })

    it('/fuel-tank/events (GET) should return SSE stream headers', () => {
      return request(app.getHttpServer())
        .get('/fuel-tank/events')
        .expect(200)
        .timeout(1000) // Short timeout for header check only
    })
  })
})
