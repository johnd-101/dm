'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function AuthButton({ email }: { email?: string }) {
  const router = useRouter()
  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }
  return (
    <div className="flex items-center gap-2">
      {email && <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#f3f1ff] border border-[#e9e6ff] hidden md:block">{email}</span>}
      <button onClick={logout} className="px-4 py-1.5 rounded-full border-2 bg-white text-xs font-bold hover:border-violet-300">Logout</button>
    </div>
  )
}
