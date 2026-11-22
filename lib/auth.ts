import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null
  let dbUser = null
  try {
    dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
  } catch {}
  if (!dbUser) {
    try {
      dbUser = await prisma.user.findUnique({ where: { id: 'u5' } })
    } catch {}
  }
  return { auth: authUser, db: dbUser }
}
