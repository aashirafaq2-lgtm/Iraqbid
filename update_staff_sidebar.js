const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

const target = `          {/* 10. Employees & Permissions */}
          {canAccessStaff && (
            <button
              onClick={() => setActiveTab('staff')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: activeTab === 'staff' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: activeTab === 'staff' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'staff' ? '600' : '500',
                fontSize: '13px'
              }}
            >
              <Key size={18} />
              {sidebarOpen && <span>10. Employees & Permissions</span>}
            </button>
          )}`;

const replacement = `          {/* 10. Employees & Permissions */}
          {canAccessStaff && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                onClick={() => {
                  setActiveTab('staff');
                  setStaffMenuExpanded(!staffMenuExpanded);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  backgroundColor: activeTab === 'staff' ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                  color: activeTab === 'staff' ? '#818cf8' : '#94a3b8',
                  fontWeight: activeTab === 'staff' ? '600' : '500',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Key size={18} />
                  {sidebarOpen && <span>10. Employees & Permissions</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown size={15} style={{ transform: staffMenuExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                )}
              </button>

              {/* Sub items for Employees & Permissions */}
              {sidebarOpen && staffMenuExpanded && (
                <div style={{ marginLeft: '32px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '8px' }}>
                  <button
                    onClick={() => {
                      setActiveTab('staff');
                      setStaffSubTab('list');
                      fetchStaff();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: (activeTab === 'staff' && staffSubTab === 'list') ? '#38bdf8' : '#94a3b8',
                      fontWeight: (activeTab === 'staff' && staffSubTab === 'list') ? '700' : '500'
                    }}
                  >
                    Employees List
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('staff');
                      setStaffSubTab('add');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: (activeTab === 'staff' && staffSubTab === 'add') ? '#f97316' : '#94a3b8',
                      fontWeight: (activeTab === 'staff' && staffSubTab === 'add') ? '700' : '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserPlus size={13} /> Add Employee
                  </button>
                </div>
              )}
            </div>
          )}`;

const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(code).includes(normalize(target))) {
  code = normalize(code).replace(normalize(target), replacement);
  fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
  console.log('Successfully replaced 10. Employees in sidebar with sub-menu!');
} else {
  console.log('target not found even with normalize');
}
