import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    // We use a raw query because auth.users is likely not in the schema
    const users = await prisma.$queryRawUnsafe(
      'SELECT id, email, encrypted_password FROM auth.users LIMIT 5;'
    )
    console.log('Sample Users in auth.users:', JSON.stringify(users, null, 2))
    
    const count = await prisma.$queryRawUnsafe(
      'SELECT count(*) FROM auth.users;'
    )
    console.log('Total Users in auth.users:', count)
  } catch (error) {
    console.error('Error querying auth.users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
