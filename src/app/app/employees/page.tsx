import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'

export default async function EmployeesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return null
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Employees</h1>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((emp: any) => (
              <tr key={emp.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{emp.full_name || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{emp.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${ROLE_COLORS[emp.role as keyof typeof ROLE_COLORS]}`}>
                    {ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={emp.is_active ? 'text-green-400' : 'text-red-400'}>
                    {emp.is_active ? '● Active' : '● Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(emp.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <form action={`/app/employees/${emp.id}/toggle`} method="POST" className="inline">
                    <button
                      type="submit"
                      className={`text-xs px-2 py-1 rounded ${emp.is_active ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}
                    >
                      {emp.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                  <form action={`/app/employees/${emp.id}/role`} method="POST" className="inline ml-2">
                    <select
                      name="role"
                      defaultValue={emp.role}
                      onChange={(e) => e.target.form?.requestSubmit()}
                      className="text-xs bg-slate-700 text-white border border-slate-600 rounded px-1 py-1"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}