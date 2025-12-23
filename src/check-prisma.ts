import { prisma } from '@/lib/prisma'

async function check() {
  // @ts-ignore
  console.log('checklistItem exists:', !!prisma.checklistItem)
  // @ts-ignore
  console.log('checklistItems exists:', !!prisma.checklistItems)
}

check()
