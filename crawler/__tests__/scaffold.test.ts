import { PrismaClient } from '@prisma/client'

describe('crawler scaffold', () => {
  it('Prisma client MarketListing modelini tanır', () => {
    const client = new PrismaClient()
    expect(client.marketListing).toBeDefined()
    expect(client.marketListingPricePoint).toBeDefined()
    expect(client.crawlRun).toBeDefined()
  })
})
