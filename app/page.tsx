"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Role = "ADMIN" | "MODERATOR" | "USER";
type User = { id: string; name: string; email: string; role: Role; status: string; avatar: string; bio: string; phone: string; location: string; createdAt: string; lastSeen: string; };
type Message = { id: string; content: string; senderId: string; recipientId: string; read: boolean; createdAt: string; saving?: boolean; error?: boolean; };

const CURRENT_USER_ID = "u5";

const SEED_USERS: User[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah.chen@company.com", role: "ADMIN", status: "active", avatar: "https://i.pravatar.cc/150?img=5", bio: "Product lead", phone: "+27 82 123 4567", location: "Cape Town, SA", createdAt: new Date(Date.now()-30*86400000).toISOString(), lastSeen: new Date().toISOString() },
  { id: "u2", name: "Marcus Johnson", email: "marcus.j@company.com", role: "MODERATOR", status: "active", avatar: "https://i.pravatar.cc/150?img=12", bio: "Community moderator", phone: "+27 82 234 5678", location: "Johannesburg", createdAt: new Date(Date.now()-20*86400000).toISOString(), lastSeen: new Date(Date.now()-3600000).toISOString() },
  { id: "u3", name: "Aisha Patel", email: "aisha.p@company.com", role: "USER", status: "active", avatar: "https://i.pravatar.cc/150?img=26", bio: "UX Designer", phone: "+27 82 345 6789", location: "Durban", createdAt: new Date(Date.now()-10*86400000).toISOString(), lastSeen: new Date(Date.now()-7200000).toISOString() },
  { id: "u4", name: "David Kim", email: "david.k@company.com", role: "USER", status: "inactive", avatar: "https://i.pravatar.cc/150?img=15", bio: "Frontend dev", phone: "+27 82 456 7890", location: "Cape Town", createdAt: new Date(Date.now()-5*86400000).toISOString(), lastSeen: new Date(Date.now()-86400000).toISOString() },
  { id: "u5", name: "John Fortuin", email: "john@company.com", role: "ADMIN", status: "active", avatar: "https://i.pravatar.cc/150?img=33", bio: "Admin", phone: "+27 82 000 0000", location: "Cape Town", createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
  { id: "u6", name: "Lisa van Wyk", email: "lisa@company.com", role: "USER", status: "active", avatar: "https://i.pravatar.cc/150?img=32", bio: "Support", phone: "+27 82 111 2222", location: "Stellenbosch", createdAt: new Date(Date.now()-2*86400000).toISOString(), lastSeen: new Date().toISOString() },
];

const SEED_MSGS: Message[] = [
  { id: "m1", senderId: "u1", recipientId: "u5", content: "Hey John, can you check the new user report?", read: false, createdAt: new Date(Date.now()-3600000).toISOString() },
  { id: "m2", senderId: "u5", recipientId: "u1", content: "On it now - looks good!", read: true, createdAt: new Date(Date.now()-1800000).toISOString() },
  { id: "m3", senderId: "u2", recipientId: "u5", content: "User u4 flagged for review", read: false, createdAt: new Date(Date.now()-7200000).toISOString() },
];

export default function Page() {
  const [isDark, setIsDark] = useState(false);
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [messages, setMessages] = useState<Message[]>(SEED_MSGS);
  const [tab, setTab] = useState<"dashboard"|"users"|"messages">("dashboard");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User|null>(null);
  const [chatUserId, setChatUserId] = useState<string>("u1");
  const [newMsg, setNewMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dbStatus, setDbStatus] = useState<"checking"|"connected"|"local">("checking");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<Partial<User>>({ name: "", email: "", role: "USER", status: "active", bio: "", phone: "", location: "", avatar: "" });

  useEffect(() => {
    const saved = localStorage.getItem("adminhub-theme");
    if (saved) setIsDark(saved === "dark");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setIsDark(true);
  }, []);
  useEffect(() => { localStorage.setItem("adminhub-theme", isDark ? "dark" : "light"); }, [isDark]);

  // Load messages from Supabase/Postgres on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/messages?currentUserId=${CURRENT_USER_ID}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data.map((m:any) => ({
              id: m.id,
              content: m.content,
              senderId: m.senderId || m.sender_id,
              recipientId: m.recipientId || m.recipient_id,
              read: m.read,
              createdAt: m.createdAt || m.created_at
            })));
            setDbStatus("connected");
          } else {
            setDbStatus("local");
          }
        } else {
          setDbStatus("local");
        }
      } catch {
        setDbStatus("local");
      }
    };
    loadMessages();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message' }, (payload) => {
        const m = payload.new as any;
        const msg: Message = {
          id: m.id,
          content: m.content,
          senderId: m.senderId || m.sender_id,
          recipientId: m.recipientId || m.recipient_id,
          read: m.read,
          createdAt: m.createdAt || m.created_at
        };
        setMessages(prev => prev.find(x => x.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatUserId]);

  const filteredUsers = useMemo(()=> users.filter(u=> `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const conversation = useMemo(()=> messages.filter(m=> (m.senderId===chatUserId && m.recipientId===CURRENT_USER_ID) || (m.senderId===CURRENT_USER_ID && m.recipientId===chatUserId)).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()), [messages, chatUserId]);

  const sendMessage = async () => {
    if (!newMsg.trim() || isSending) return;
    const content = newMsg.trim();
    const tempId = "temp-" + Date.now();
    const tempMsg: Message = { id: tempId, senderId: CURRENT_USER_ID, recipientId: chatUserId, content, read: false, createdAt: new Date().toISOString(), saving: true };
    
    setMessages(prev => [...prev, tempMsg]);
    setNewMsg("");
    setIsSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderId: CURRENT_USER_ID, recipientId: chatUserId })
      });

      if (!res.ok) throw new Error("API failed");
      const saved = await res.json();

      // Replace temp with saved
      setMessages(prev => prev.map(m => m.id === tempId ? {
        id: saved.id,
        content: saved.content,
        senderId: saved.senderId,
        recipientId: saved.recipientId,
        read: saved.read,
        createdAt: saved.createdAt
      } : m));
      setDbStatus("connected");
    } catch (err) {
      console.error("Message save failed:", err);
      // Keep optimistic but mark error, allow retry
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, saving: false, error: true } : m));
      setDbStatus("local");
    } finally {
      setIsSending(false);
    }
  };

  const createUser = async () => {
    if (!form.name || !form.email) return;
    const u: User = { id: "u"+Date.now(), name: form.name!, email: form.email!, role: form.role as Role || "USER", status: form.status||"active", avatar: form.avatar || `https://i.pravatar.cc/150?img=${Math.floor(Math.random()*70)}`, bio: form.bio||"", phone: form.phone||"", location: form.location||"", createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() };
    setUsers([u, ...users]);
    try {
      await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: u.name, email: u.email, role: u.role, status: u.status, avatar: u.avatar, bio: u.bio, phone: u.phone, location: u.location }) });
    } catch {}
    setShowCreate(false);
    setForm({ name: "", email: "", role: "USER", status: "active", bio: "", phone: "", location: "", avatar: "" });
  };

  const theme = {
    bg: isDark ? "bg-[#0a0a12]" : "bg-[#f8f7ff]",
    card: isDark ? "bg-[#181821]/80 backdrop-blur-xl border-[#2a2a3a]" : "bg-white/80 backdrop-blur-xl border-[#e9e6ff]",
    cardSolid: isDark ? "bg-[#1e1e2e] border-[#2a2a3a]" : "bg-white border-[#e9e6ff]",
    text: isDark ? "text-[#f1f0ff]" : "text-[#0f0f1a]",
    textMuted: isDark ? "text-[#9a9ab5]" : "text-[#6b6b8a]",
    input: isDark ? "bg-[#252538] border-[#2a2a3a] text-white placeholder:text-[#6a6a8a]" : "bg-[#f3f1ff] border-[#e9e6ff] text-slate-900",
    sidebar: isDark ? "bg-[#12121c]/90 border-[#1e1e30]" : "bg-white/90 border-[#ece9ff]",
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      <aside className={`w-[300px] ${theme.sidebar} border-r p-7 hidden lg:flex flex-col gap-8 sticky top-0 h-screen`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 flex items-center justify-center text-white font-black">A</div>
          <div className="font-black text-[22px] tracking-tight">AdminHub</div>
          <div className={`ml-auto w-2 h-2 rounded-full ${dbStatus==="connected" ? "bg-emerald-400" : dbStatus==="checking" ? "bg-amber-400" : "bg-slate-300"}`} title={dbStatus}></div>
        </div>
        <nav className="flex flex-col gap-3">
          {[
            { k: "dashboard", l: "Dashboard", icon: "◫" },
            { k: "users", l: "Users", icon: "◍" },
            { k: "messages", l: "Messages", icon: "✉" },
          ].map(i=> (
            <button key={i.k} onClick={()=>setTab(i.k as any)} className={`text-left px-5 py-3.5 rounded-full font-semibold transition-all duration-300 flex items-center gap-3 border-2 ${tab===i.k ? "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white border-transparent shadow-lg shadow-violet-500/30 scale-[1.02]" : `${theme.cardSolid} ${theme.textMuted} hover:scale-[1.02] hover:border-violet-200`}`}>
              <span>{i.icon}</span>{i.l}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-[1.5px] rounded-[24px] bg-gradient-to-br from-violet-600 via-fuchsia-400 to-indigo-600">
          <div className={`p-4 rounded-[22px] ${theme.cardSolid}`}>
            <div className="text-[13px] font-bold flex items-center gap-2">Supabase <span className={`w-2 h-2 rounded-full ${dbStatus==="connected" ? "bg-emerald-500" : "bg-amber-500"}`}></span></div>
            <div className={`text-[11px] mt-1 leading-relaxed ${theme.textMuted}`}>{dbStatus==="connected" ? "Connected to Postgres • Messages saving to DB" : dbStatus==="checking" ? "Checking DB..." : "Local mode • Set DATABASE_URL to enable saving"}</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className={`h-[72px] ${theme.sidebar} border-b backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-6 lg:px-8 gap-4`}>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-black tracking-widest">{tab.toUpperCase()}</div>
            {dbStatus==="connected" && <span className="hidden md:flex text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">DB CONNECTED • MESSAGES SAVING</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center p-[1.5px] rounded-full bg-gradient-to-r from-violet-200 to-indigo-200`}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." className={`px-5 py-2.5 rounded-full ${theme.cardSolid} text-sm w-64 outline-none focus:ring-2 focus:ring-violet-400 transition`} />
            </div>
            <button onClick={()=>setIsDark(!isDark)} className={`w-14 h-9 rounded-full p-1 flex items-center transition-all duration-500 border-2 ${isDark ? "bg-[#252538] border-[#2a2a3a] justify-end" : "bg-[#f3f1ff] border-[#e9e6ff] justify-start"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all duration-500 ${isDark ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white" : "bg-white text-slate-700 shadow"}`}>{isDark ? "🌙" : "☀️"}</div>
            </button>
            <button onClick={()=>setShowCreate(true)} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all">+ New User</button>
          </div>
        </header>

        {tab==="dashboard" && (
          <div className="p-6 lg:p-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Total Users", val: users.length, grad: "from-violet-600 to-indigo-600" },
                { label: "Active Today", val: users.filter(u=>u.status==="active").length, grad: "from-emerald-400 to-cyan-500" },
                { label: "Messages", val: messages.length, grad: "from-fuchsia-500 to-pink-500" },
                { label: "DB Status", val: dbStatus==="connected" ? "Live" : "Local", grad: dbStatus==="connected" ? "from-emerald-400 to-cyan-500" : "from-amber-400 to-orange-500" },
              ].map((s,i)=>(
                <div key={i} className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-violet-200 via-fuchsia-100 to-indigo-200">
                  <div className={`${theme.cardSolid} p-6 rounded-[26px]`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.grad} mb-3`}></div>
                    <div className={`text-[11px] font-bold tracking-widest ${theme.textMuted}`}>{s.label.toUpperCase()}</div>
                    <div className="text-3xl font-black mt-1">{s.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-span-12 lg:col-span-8 p-[1.5px] rounded-[28px] bg-gradient-to-br from-violet-100 to-indigo-100">
              <div className={`${theme.cardSolid} rounded-[26px] p-7`}>
                <div className="font-black text-[15px] tracking-wide">Recent Users</div>
                {users.slice(0,5).map(u=>(
                  <div key={u.id} className="flex items-center gap-4 py-4 border-b last:border-0 border-dashed">
                    <div className="p-[2px] rounded-full bg-gradient-to-br from-violet-600 to-indigo-600"><img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white" alt="" /></div>
                    <div className="flex-1"><div className="font-bold text-sm">{u.name}</div><div className={`text-xs ${theme.textMuted}`}>{u.email}</div></div>
                    <span className="text-[10px] px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold">{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 p-[1.5px] rounded-[28px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 shadow-xl shadow-violet-500/20">
              <div className="rounded-[26px] p-7 bg-gradient-to-br from-[#1a1a2e] to-[#12121c] text-white h-full">
                <div className="font-black">Supabase Setup</div>
                <div className="text-[12px] text-white/70 mt-3 leading-relaxed space-y-2">
                  <div>1. DATABASE_URL = Supabase Postgres pooled URL</div>
                  <div>2. NEXT_PUBLIC_SUPABASE_URL + ANON_KEY</div>
                  <div>3. npx prisma db push</div>
                  <div className="pt-2 text-emerald-300">Messages now saved via /api/messages → Prisma → Supabase Postgres. Realtime enabled via supabase channel on Message table.</div>
                </div>
                <div className="mt-6 text-[11px] font-mono bg-white/10 p-4 rounded-full border border-white/10">supabase.from('Message').insert()</div>
              </div>
            </div>
          </div>
        )}

        {tab==="users" && (
          <div className="p-6 lg:p-8">
            <div className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-violet-100 to-indigo-100">
              <div className={`${theme.cardSolid} rounded-[26px] overflow-hidden`}>
                <table className="w-full text-sm">
                  <thead className={`${isDark ? "bg-[#12121c]" : "bg-[#f9f7ff]"} text-[11px] font-black tracking-widest ${theme.textMuted}`}><tr><th className="p-5 text-left">User</th><th className="p-5">Role</th><th className="p-5">Status</th><th className="p-5">Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(u=>(
                      <tr key={u.id} className={`border-t border-dashed ${isDark ? "border-[#2a2a3a] hover:bg-[#1e1e2e]" : "border-[#ece9ff] hover:bg-[#faf8ff]"}`}>
                        <td className="p-5 flex items-center gap-3"><div className="p-[1.5px] rounded-full bg-gradient-to-br from-violet-600 to-indigo-600"><img src={u.avatar} className="w-9 h-9 rounded-full border-2 border-white" alt="" /></div><div><div className="font-bold">{u.name}</div><div className={`text-[11px] ${theme.textMuted}`}>{u.email}</div></div></td>
                        <td className="p-5"><span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black">{u.role}</span></td>
                        <td className="p-5"><span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-2 ${u.status==="active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100"}`}>{u.status}</span></td>
                        <td className="p-5 flex gap-2">
                          <button onClick={()=>setSelectedUser(u)} className={`px-4 py-1.5 rounded-full border-2 text-[11px] font-bold ${theme.cardSolid}`}>View</button>
                          <button onClick={()=>{ setChatUserId(u.id); setTab("messages"); }} className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold">Message</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==="messages" && (
          <div className="flex h-[calc(100vh-72px)]">
            <div className={`w-[340px] ${theme.sidebar} border-r p-5 flex flex-col gap-2 overflow-auto`}>
              <div className="font-black text-[12px] tracking-widest mb-2">CONVERSATIONS • {dbStatus.toUpperCase()}</div>
              {users.filter(u=>u.id!==CURRENT_USER_ID).map(u=>{
                const last = messages.filter(m=>m.senderId===u.id||m.recipientId===u.id).slice(-1)[0];
                const unread = messages.filter(m=>m.senderId===u.id && m.recipientId===CURRENT_USER_ID && !m.read).length;
                return (
                  <button key={u.id} onClick={()=>setChatUserId(u.id)} className={`flex items-center gap-3 p-4 rounded-full text-left border-2 transition-all ${chatUserId===u.id ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-lg" : `${theme.cardSolid} hover:border-violet-200`}`}>
                    <img src={u.avatar} className="w-9 h-9 rounded-full border-2 border-white/50" alt="" />
                    <div className="flex-1 min-w-0"><div className="text-[13px] font-bold truncate flex items-center gap-2">{u.name} {unread>0 && <span className="w-5 h-5 rounded-full bg-white text-violet-600 text-[10px] font-black flex items-center justify-center">{unread}</span>}</div><div className="text-[11px] opacity-70 truncate">{last?.content || "No messages"}</div></div>
                  </button>
                )
              })}
            </div>
            <div className="flex-1 flex flex-col">
              <div className={`p-4 border-b ${theme.sidebar} flex items-center gap-3`}>
                <div className="p-[2px] rounded-full bg-gradient-to-br from-violet-600 to-indigo-600"><img src={users.find(u=>u.id===chatUserId)?.avatar} className="w-9 h-9 rounded-full border-2 border-white" alt="" /></div>
                <div><div className="font-bold">{users.find(u=>u.id===chatUserId)?.name}</div><div className={`text-[10px] ${theme.textMuted}`}>{dbStatus==="connected" ? "Saving to Supabase Postgres" : "Local mode"}</div></div>
              </div>
              <div className={`flex-1 p-6 flex flex-col gap-4 overflow-auto ${isDark ? "bg-[#0f0f18]" : "bg-[#fcfbff]"}`}>
                {conversation.length===0 && <div className={`text-center mt-20 ${theme.textMuted} text-sm`}>No messages yet — start the conversation. Messages will save to Supabase.</div>}
                {conversation.map(m=>(
                  <div key={m.id} className={`max-w-[70%] px-5 py-3 rounded-[24px] text-[13px] border-2 ${m.senderId===CURRENT_USER_ID ? "self-end bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white border-transparent shadow-lg rounded-br-[8px]" : `${theme.cardSolid} self-start rounded-bl-[8px]`}`}>
                    {m.content}
                    <div className="text-[10px] opacity-60 mt-1.5 flex gap-2">
                      <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                      {m.senderId===CURRENT_USER_ID && <span>{(m as any).saving ? "Saving..." : (m as any).error ? "Failed • retry" : "Saved ✓"}</span>}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className={`p-4 ${theme.sidebar} border-t flex gap-3`}>
                <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Type a message... will save to Supabase DB" className={`flex-1 px-6 py-3 rounded-full ${theme.input} outline-none border-2 focus:border-violet-400 transition`} />
                <button onClick={sendMessage} disabled={isSending || !newMsg.trim()} className="px-7 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black tracking-wide shadow-lg disabled:opacity-50 hover:scale-105 transition">{isSending ? "..." : "Send → DB"}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex justify-end z-50">
          <div className={`w-[440px] ${isDark ? "bg-[#181821] border-[#2a2a3a]" : "bg-white border-[#ece9ff]"} border-l h-full p-8 overflow-auto`}>
            <button onClick={()=>setSelectedUser(null)} className={`text-[12px] font-black tracking-widest px-4 py-2 rounded-full border-2 ${theme.cardSolid}`}>← CLOSE</button>
            <div className="flex flex-col items-center mt-8">
              <div className="p-[3px] rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600"><img src={selectedUser.avatar} className="w-28 h-28 rounded-full border-4 border-white" alt="" /></div>
              <div className="mt-5 font-black text-2xl tracking-tight">{selectedUser.name}</div>
              <div className={`text-sm ${theme.textMuted}`}>{selectedUser.email}</div>
            </div>
            <button onClick={()=>{ setChatUserId(selectedUser.id); setSelectedUser(null); setTab("messages"); }} className="mt-8 w-full py-4 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white font-black tracking-wide shadow-xl hover:scale-[1.02] transition">Send Direct Message</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`p-[1.5px] rounded-[32px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 w-full max-w-lg`}>
            <div className={`${isDark ? "bg-[#181821]" : "bg-white"} rounded-[30px] p-8`}>
              <div className="font-black text-xl tracking-tight">Create User</div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className={`col-span-2 px-5 py-3.5 rounded-full border-2 outline-none ${theme.input}`} />
                <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className={`col-span-2 px-5 py-3.5 rounded-full border-2 outline-none ${theme.input}`} />
                <select value={form.role} onChange={e=>setForm({...form, role:e.target.value as any})} className={`px-5 py-3.5 rounded-full border-2 ${theme.input}`}><option>USER</option><option>MODERATOR</option><option>ADMIN</option></select>
                <input placeholder="Location" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} className={`px-5 py-3.5 rounded-full border-2 ${theme.input}`} />
              </div>
              <div className="flex gap-3 mt-7">
                <button onClick={()=>setShowCreate(false)} className={`flex-1 py-3.5 rounded-full border-2 font-bold ${theme.cardSolid}`}>Cancel</button>
                <button onClick={createUser} className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black">Create + Save to DB</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
