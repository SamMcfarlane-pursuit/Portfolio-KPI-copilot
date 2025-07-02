const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function getPortfolioId() {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      select: { id: true, name: true }
    })
    console.log('Portfolio:', portfolio)
    return portfolio?.id
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getPortfolioId() 