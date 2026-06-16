import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('--- User Password and Email Sync Migration ---')
    
    // Check initial counts
    const totalAuthUsers: any[] = await prisma.$queryRawUnsafe('SELECT count(*) FROM auth.users;')
    const authCount = Number(totalAuthUsers[0].count)
    console.log(`- Detected ${authCount} users in auth.users schema.`)
    
    const profilesToUpdate: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) FROM public.profiles 
      WHERE password IS NULL;
    `)
    console.log(`- Profiles with NULL password: ${profilesToUpdate[0].count}`)

    // Execute bulk update
    console.log('- Running bulk update...')
    const result = await prisma.$executeRawUnsafe(`
      UPDATE public.profiles p
      SET 
        password = u.encrypted_password,
        email_verified = u.email_confirmed_at
      FROM auth.users u
      WHERE p.id = u.id AND p.password IS NULL;
    `)
    
    console.log(`- Successfully updated ${result} profiles.`)
    
    // Final check
    const finalizedProfiles: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) FROM public.profiles 
      WHERE password IS NOT NULL;
    `)
    console.log(`- Total Profiles with active passwords: ${finalizedProfiles[0].count}`)
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
