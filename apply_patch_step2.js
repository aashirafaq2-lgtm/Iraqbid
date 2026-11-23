const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

// 1. Remove duplicate logo
const targetLogoBlock = `      {/* SIDEBAR NAVIGATION */}
      <div 
        className={\`sidebar-container \${!sidebarOpen ? 'closed' : ''}\`}
        style={{
          width: sidebarOpen ? '280px' : '76px',
          minWidth: sidebarOpen ? '280px' : '76px',
          backgroundColor: '#0a0f1d',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '20px 12px',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
          zIndex: 50
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.5px' }}>
                IRAQ BID
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>Enterprise Operations ERP</div>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Logo */}`;

const cleanLogoBlock = `      {/* SIDEBAR NAVIGATION */}
      <div 
        className={\`sidebar-container \${!sidebarOpen ? 'closed' : ''}\`}
        style={{
          width: sidebarOpen ? '280px' : '76px',
          minWidth: sidebarOpen ? '280px' : '76px',
          backgroundColor: 'rgba(10, 15, 29, 0.75)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '20px 12px',
          boxShadow: '4px 0 32px rgba(0,0,0,0.6)',
          zIndex: 50
        }}
      >
        {/* Brand Logo */}`;

if (code.includes(targetLogoBlock)) {
  code = code.replace(targetLogoBlock, cleanLogoBlock);
  console.log('Cleaned duplicate logo and upgraded sidebar to glass');
} else {
  console.log('targetLogoBlock not found, checking alternatives...');
}

// 2. Upgrade Sidebar 10. Employees & Permissions to have expandable sub-menu
const staffSidebarTarget = `          {/* 10. Employees & Permissions */}
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

const staffSidebarRepl = `          {/* 10. Employees & Permissions (with sub-menu) */}
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
                    All Employees List
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

if (code.includes(staffSidebarTarget)) {
  code = code.replace(staffSidebarTarget, staffSidebarRepl);
  console.log('Upgraded staff sidebar item with sub-menu');
} else {
  console.log('staffSidebarTarget not found');
}

fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
