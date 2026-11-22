'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('john@company.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [msg, setMsg] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: email.split('@')[0] } }
        })
        if (error) throw error
        setMsg('Check your email to confirm signup! Then login.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7ff] p-4">
      <div className="p-[1.5px] rounded-[32px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 shadow-2xl w-full max-w-md">
        <div className="bg-white rounded-[30px] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black">A</div>
            <div className="font-black text-xl">AdminHub</div>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="text-sm text-slate-500 mb-6">{mode === 'login' ? 'Login as John Fortuin (u5) to test DMs' : 'Sign up, then you will be mapped to your Prisma User'}</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-5 py-3.5 rounded-full border-2 border-[#e9e6ff] bg-[#f3f1ff] outline-none focus:border-violet-400" />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" required className="w-full px-5 py-3.5 rounded-full border-2 border-[#e9e6ff] bg-[#f3f1ff] outline-none focus:border-violet-400" />
            {msg && <div className={`p-3 rounded-full text-xs font-bold text-center border-2 ${msg.includes('Check') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg}</div>}
            <button disabled={loading} className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white font-black shadow-lg disabled:opacity-50">{loading ? '...' : mode === 'login' ? 'Login → Dashboard' : 'Sign Up'}</button>
          </form>
          <div className="mt-6 flex justify-between text-xs">
            <button onClick={()=>setMode(mode==='login'?'signup':'login')} className="font-bold text-violet-600">{mode === 'login' ? 'Need account? Sign up' : 'Have account? Login'}</button>
            <span className="text-slate-400">Supabase Auth</span>
          </div>
          <div className="mt-8 p-4 rounded-[20px] bg-[#f8f7ff] border-2 border-dashed border-[#e9e6ff] text-[11px] leading-relaxed">
            <b>Test login:</b> john@company.com / password123<br/>Or sign up with any email — you will be logged in as ADMIN (u5) for DMs.
          </div>
        </div>
      </div>
    </div>
  )
}
