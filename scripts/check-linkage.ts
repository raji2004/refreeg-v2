import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const matches = await prisma.$queryRawUnsafe(`
      SELECT p.id, p.email as profile_email, u.email as auth_email
      FROM public.profiles p
      JOIN auth.users u ON p.id = u.id
      LIMIT 1;
    `)
    console.log('Match Found:', matches)
  } catch (error) {
    console.error('Error joining tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
