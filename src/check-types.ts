import { prisma } from '@/lib/prisma'

async function check() {
  const user = await prisma.user.findFirst()
  if (user) {
    console.log(user.id)
  }
}
check()
