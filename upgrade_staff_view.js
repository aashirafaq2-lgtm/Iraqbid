const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

// Target the staff module block
const targetStaffBlock = `{/* =====================================================================
            MODULE 10: EMPLOYEES & CUSTOM GRANULAR PERMISSIONS
           ===================================================================== */}
        {activeTab === 'staff' && canAccessStaff && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Employees & Custom Granular Permissions</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Define custom permissions individually per employee across Inventory, Auctions, Customers, Orders, and System settings.
                </p>
              </div>

              <button
                onClick={() => setShowStaffModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ea580c', backgroundImage: 'linear-gradient(to right, #ea580c, #f97316)', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)' }}>
                <UserPlus size={16} /> Add Employee
              </button>
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Staff Name</th>
                    <th style={{ padding: '16px 20px' }}>Email Address</th>
                    <th style={{ padding: '16px 20px' }}>Base Role</th>
                    <th style={{ padding: '16px 20px' }}>Status</th>
                    <th style={{ padding: '16px 20px' }}>Custom Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => {
                    const sb = getRoleBadge(s.role);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{s.name}</td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{s.email}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: sb.bg, color: sb.color }}>
                            {sb.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '11px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                            {s.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <button
                            onClick={async () => {
                              const res = await axios.get(\`\${API_ENTERPRISE}/employees/\${s.id}/permissions\`);
                              setSelectedEmployeePerms({ staff: s, perms: res.data.data || [] });
                              setShowPermsModal(true);
                            }}
                            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', color: '#38bdf8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Configure Permissions
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}`;

const newStaffBlock = `{/* =====================================================================
            MODULE 10: EMPLOYEES & CUSTOM GRANULAR PERMISSIONS
           ===================================================================== */}
        {activeTab === 'staff' && canAccessStaff && (
          <div style={{ padding: '32px' }}>
            {/* Top Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(16px)', padding: '5px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  onClick={() => setStaffSubTab('list')}
                  style={{
                    backgroundColor: staffSubTab === 'list' ? '#6366f1' : 'transparent',
                    color: staffSubTab === 'list' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: staffSubTab === 'list' ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Users size={16} /> All Employees ({staffList.length})
                </button>
                <button
                  onClick={() => setStaffSubTab('add')}
                  style={{
                    backgroundColor: staffSubTab === 'add' ? '#ea580c' : 'transparent',
                    backgroundImage: staffSubTab === 'add' ? 'linear-gradient(to right, #ea580c, #f97316)' : 'none',
                    color: staffSubTab === 'add' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: staffSubTab === 'add' ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <UserPlus size={16} /> Add Employee
                </button>
              </div>

              {staffSubTab === 'list' && (
                <button
                  onClick={() => setStaffSubTab('add')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ea580c', backgroundImage: 'linear-gradient(to right, #ea580c, #f97316)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)' }}>
                  <UserPlus size={16} /> Add Employee
                </button>
              )}
            </div>

            {/* TAB 1: ALL EMPLOYEES TABLE */}
            {staffSubTab === 'list' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Employees & Custom Granular Permissions</h2>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Define custom permissions individually per employee across Inventory, Auctions, Customers, Orders, and System settings.
                  </p>
                </div>

                <div className="glass-panel" style={{ borderRadius: '16px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                        <th style={{ padding: '16px 20px' }}>Staff Name</th>
                        <th style={{ padding: '16px 20px' }}>Email Address</th>
                        <th style={{ padding: '16px 20px' }}>Base Role</th>
                        <th style={{ padding: '16px 20px' }}>Status</th>
                        <th style={{ padding: '16px 20px' }}>Custom Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map(s => {
                        const sb = getRoleBadge(s.role);
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{s.name}</td>
                            <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{s.email}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: sb.bg, color: sb.color }}>
                                {sb.label}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ fontSize: '11px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                                {s.status || 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <button
                                onClick={async () => {
                                  const res = await axios.get(\`\${API_ENTERPRISE}/employees/\${s.id}/permissions\`);
                                  setSelectedEmployeePerms({ staff: s, perms: res.data.data || [] });
                                  setShowPermsModal(true);
                                }}
                                style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                Configure Permissions
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: DEDICATED FULL-PAGE ADD EMPLOYEE VIEW (MATCHING EXACT CLIENT DESIGN) */}
            {staffSubTab === 'add' && (
              <div style={{ maxWidth: '880px', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 36px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)', color: '#1e293b' }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                        <UserPlus size={22} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Add Employee</h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Create an administrative user and assign custom operational access</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStaffSubTab('list')}
                      style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                    >
                      â† Back to Employees
                    </button>
                  </div>

                  <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Section 1: Employee Information */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px 24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#334155', fontWeight: '700', fontSize: '14px' }}>
                        <Users size={16} color="#4f46e5" /> Employee Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="Ahmed Saleh"
                            value={newStaff.name}
                            onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                            style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Username <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="ahmed.s"
                            value={newStaff.username}
                            onChange={e => setNewStaff({ ...newStaff, username: e.target.value })}
                            style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type="password"
                            required
                            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                            value={newStaff.password}
                            onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                            style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Role</label>
                          <select
                            value={newStaff.role}
                            onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                            style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="editor">Editor</option>
                            {userRole === 'superadmin' && <option value="admin">Admin</option>}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Permissions Matrix */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#334155', fontWeight: '700', fontSize: '15px' }}>
                        <Shield size={18} color="#4f46e5" /> Permissions
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
                        Select the sections this employee can access and choose the permission level.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {newStaffPermissions.map((item, idx) => (
                          <div key={item.module} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              backgroundColor: item.checked ? '#f8fafc' : '#ffffff',
                              border: '1px solid',
                              borderColor: item.checked ? '#c7d2fe' : '#e2e8f0',
                              borderRadius: '10px',
                              transition: 'all 0.15s ease'
                            }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const updated = [...newStaffPermissions];
                                    updated[idx].checked = checked;
                                    if (!checked) {
                                      updated[idx].level = '';
                                      if (updated[idx].children) {
                                        updated[idx].children.forEach(c => { c.checked = false; c.level = ''; });
                                      }
                                    } else {
                                      if (!updated[idx].level && !updated[idx].isGroup) updated[idx].level = 'view';
                                      if (updated[idx].children) {
                                        updated[idx].children.forEach(c => { c.checked = true; c.level = 'full'; });
                                      }
                                    }
                                    setNewStaffPermissions(updated);
                                  }}
                                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                  {item.label}
                                </span>
                              </label>

                              {!item.isGroup ? (
                                <div style={{ width: '180px' }}>
                                  <select
                                    value={item.level}
                                    disabled={!item.checked}
                                    onChange={(e) => {
                                      const updated = [...newStaffPermissions];
                                      updated[idx].level = e.target.value;
                                      if (e.target.value) updated[idx].checked = true;
                                      setNewStaffPermissions(updated);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      border: '1px solid',
                                      borderColor: item.level === 'full' ? '#86efac' : (item.level === 'view' ? '#bfdbfe' : '#cbd5e1'),
                                      backgroundColor: item.level === 'full' ? '#f0fdf4' : (item.level === 'view' ? '#eff6ff' : '#ffffff'),
                                      color: item.level === 'full' ? '#15803d' : (item.level === 'view' ? '#1d4ed8' : '#64748b'),
                                      cursor: item.checked ? 'pointer' : 'not-allowed'
                                    }}
                                  >
                                    <option value="">â€” Select Permission â€”</option>
                                    <option value="view">View Only</option>
                                    <option value="full">Full Control</option>
                                  </select>
                                </div>
                              ) : null}
                            </div>

                            {/* Sub-items for Group (e.g. Customers) */}
                            {item.isGroup && item.children && item.checked && (
                              <div style={{ marginLeft: '32px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {item.children.map((child, cIdx) => (
                                  <div key={child.module} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 14px',
                                    backgroundColor: child.checked ? '#f1f5f9' : '#fafafa',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                  }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                                      <input
                                        type="checkbox"
                                        checked={child.checked}
                                        onChange={(e) => {
                                          const updated = [...newStaffPermissions];
                                          updated[idx].children[cIdx].checked = e.target.checked;
                                          if (!e.target.checked) updated[idx].children[cIdx].level = '';
                                          else if (!updated[idx].children[cIdx].level) updated[idx].children[cIdx].level = 'full';
                                          setNewStaffPermissions(updated);
                                        }}
                                        style={{ width: '15px', height: '15px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                      />
                                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#334155' }}>
                                        {child.label}
                                      </span>
                                    </label>

                                    <div style={{ width: '180px' }}>
                                      <select
                                        value={child.level}
                                        disabled={!child.checked}
                                        onChange={(e) => {
                                          const updated = [...newStaffPermissions];
                                          updated[idx].children[cIdx].level = e.target.value;
                                          if (e.target.value) updated[idx].children[cIdx].checked = true;
                                          setNewStaffPermissions(updated);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '6px 10px',
                                          borderRadius: '8px',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          border: '1px solid',
                                          borderColor: child.level === 'full' ? '#86efac' : (child.level === 'view' ? '#bfdbfe' : '#cbd5e1'),
                                          backgroundColor: child.level === 'full' ? '#f0fdf4' : (child.level === 'view' ? '#eff6ff' : '#ffffff'),
                                          color: child.level === 'full' ? '#15803d' : (child.level === 'view' ? '#1d4ed8' : '#64748b'),
                                          cursor: child.checked ? 'pointer' : 'not-allowed'
                                        }}
                                      >
                                        <option value="">â€” Select Permission â€”</option>
                                        <option value="view">View Only</option>
                                        <option value="full">Full Control</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => setStaffSubTab('list')}
                        style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={staffLoading}
                        style={{
                          backgroundColor: '#ea580c',
                          backgroundImage: 'linear-gradient(to right, #ea580c, #f97316)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '10px 26px',
                          borderRadius: '10px',
                          cursor: staffLoading ? 'not-allowed' : 'pointer',
                          fontWeight: '700',
                          fontSize: '13px',
                          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {staffLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Employee
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}`;

const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(code).includes(normalize(targetStaffBlock))) {
  code = normalize(code).replace(normalize(targetStaffBlock), newStaffBlock);
  fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
  console.log('Successfully upgraded Module 10 to include dedicated Add Employee View!');
} else {
  console.log('targetStaffBlock not found, checking alternatives...');
}
