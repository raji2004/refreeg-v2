import { PrismaClient } from '@prisma/client'
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } from '@aws-sdk/client-ec2'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'

dotenv.config()

async function main() {
  console.log('🔍 System Status Check Starting...\n')

  // 1. Check Database Connectivity via Prisma
  console.log('--- 🗄️ Database Check ---')
  const prisma = new PrismaClient()
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - start
    console.log(`✅ Database: Connected successfully (${duration}ms)`)
  } catch (error: any) {
    console.error(`❌ Database: Connection failed!`)
    console.error(`   Error: ${error.message}`)
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n--- ☁️ EC2 Instance Check ---')
  
  // Try to find the EC2 instance using the hostname/IP from the connection string
  const dbUrl = process.env.DATABASE_URL || ''
  const hostnameMatch = dbUrl.match(/@([^:/]+)/)
  const hostname = hostnameMatch ? hostnameMatch[1] : ''

  if (!hostname) {
    console.log('⚠️ Could not determine EC2 hostname from DATABASE_URL')
  } else {
    console.log(`Target Host: ${hostname}`)
    
    // Check if we can ping it (network layer)
    try {
      console.log(`📡 Testing network path to ${hostname}...`)
      // Use a simple TCP check if possible, or just ping
      const pingResult = execSync(`ping -n 1 ${hostname}`).toString()
      if (pingResult.includes('TTL=')) {
        console.log('✅ Network: Host is reachable via ping')
      } else {
        console.log('⚠️ Network: Host did not respond to ping (might be firewall/ICMP disabled)')
      }
    } catch (e) {
      console.log('⚠️ Network: Ping failed (this is common if ICMP is blocked in Security Groups)')
    }

    // 2. Check EC2 Status via AWS SDK
    const ec2Client = new EC2Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    })

    try {
      // Robustly extract IP: find 4 groups of digits separated by dashes or dots
      const ipMatch = hostname.match(/(\d+)[\.-](\d+)[\.-](\d+)[\.-](\d+)/)
      const ip = ipMatch ? `${ipMatch[1]}.${ipMatch[2]}.${ipMatch[3]}.${ipMatch[4]}` : ''
      
      const response = await ec2Client.send(new DescribeInstancesCommand({
        Filters: [
          { 
            Name: ip ? 'ip-address' : 'dns-name', 
            Values: [ip || hostname] 
          },
          { Name: 'instance-state-name', Values: ['running', 'pending', 'stopping', 'stopped'] }
        ]
      }))

      let instance = response.Reservations?.[0]?.Instances?.[0]

      // Fallback: if not found by IP, try searching by DNS name directly
      if (!instance && ip) {
        const dnsResponse = await ec2Client.send(new DescribeInstancesCommand({
          Filters: [
            { Name: 'dns-name', Values: [hostname] },
            { Name: 'instance-state-name', Values: ['running', 'pending', 'stopping', 'stopped'] }
          ]
        }))
        instance = dnsResponse.Reservations?.[0]?.Instances?.[0]
      }
      
      if (instance) {
        console.log(`✅ EC2 Found: ${instance.InstanceId}`)
        console.log(`   State: ${instance.State?.Name?.toUpperCase()}`)
        console.log(`   Type: ${instance.InstanceType}`)
        console.log(`   Public DNS: ${instance.PublicDnsName}`)
        console.log(`   Launch Time: ${instance.LaunchTime?.toLocaleString()}`)

        // 3. Fetch Volume info
        const volumeIds = instance.BlockDeviceMappings?.map(m => m.Ebs?.VolumeId).filter(Boolean) as string[]
        if (volumeIds && volumeIds.length > 0) {
          const volResponse = await ec2Client.send(new DescribeVolumesCommand({ VolumeIds: volumeIds }))
          volResponse.Volumes?.forEach(vol => {
            console.log(`   📦 Storage: ${vol.Size} GB (${vol.VolumeType}) - ID: ${vol.VolumeId}`)
          })
        }
      } else {
        console.log('❓ EC2: Could not find instance details in AWS.')
        console.log(`   Tried searching for IP: "${ip}" and DNS: "${hostname}"`)
        console.log('   Check if the instance is in us-east-1 and your IAM user has DescribeInstances permission.')
      }
    } catch (error: any) {
      console.error(`❌ EC2: Could not fetch status from AWS API`)
      console.error(`   Error: ${error.message}`)
    }
  }

  console.log('\n✅ Check Complete.')
}

main().catch(err => {
  console.error('Fatal Error:', err)
  process.exit(1)
})
