const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
})

async function getPortfolio() {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      select: { id: true, name: true, sector: true }
    })
    console.log('Portfolio:', portfolio)
    return portfolio
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getPortfolio() 