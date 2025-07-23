import { Module } from '@nestjs/common'

import { FuelTankModule } from './fuel-tank'

@Module({
  imports: [FuelTankModule],
})
export class AppModule {}
