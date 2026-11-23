const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

// 1. Add staffSubTab and staffMenuExpanded states
const stateTarget = "const [customerSubTab, setCustomerSubTab] = useState('customers'); // 'customers' | 'special_bidders'";
const stateRepl = "const [customerSubTab, setCustomerSubTab] = useState('customers'); // 'customers' | 'special_bidders'\n  const [staffSubTab, setStaffSubTab] = useState('list'); // 'list' | 'add'\n  const [staffMenuExpanded, setStaffMenuExpanded] = useState(true);";

if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateRepl);
  console.log('Added staff states successfully');
} else {
  console.log('stateTarget not found');
}

// 2. Add handleCreateEmployee function
const funcTarget = "const handleSaveSettings = async (e) => {";
const handleCreateEmpCode = `const handleCreateEmployee = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStaffLoading(true);
    try {
      const permissionsPayload = [];
      newStaffPermissions.forEach(item => {
        if (item.isGroup && item.children) {
          item.children.forEach(c => {
            if (c.checked) {
              permissionsPayload.push({
                module: c.module,
                can_view: true,
                can_create: c.level === 'full',
                can_edit: c.level === 'full' || c.level === 'edit',
                can_delete: c.level === 'full',
                can_approve: c.level === 'full',
                permission_level: c.level
              });
            }
          });
        } else if (item.checked) {
          permissionsPayload.push({
            module: item.module,
            can_view: true,
            can_create: item.level === 'full',
            can_edit: item.level === 'full' || item.level === 'edit',
            can_delete: item.level === 'full',
            can_approve: item.level === 'full',
            permission_level: item.level
          });
        }
      });

      const res = await axios.post(\`\${API_ADMIN}/staff\`, {
        ...newStaff,
        permissions: permissionsPayload
      });

      if (res.data.success) {
        alert(res.data.message || 'Employee created successfully');
        setShowStaffModal(false);
        setNewStaff({ name: '', username: '', email: '', password: '', phone: '', role: 'employee' });
        setStaffSubTab('list');
        fetchStaff();
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create employee');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {`;

if (code.includes(funcTarget)) {
  code = code.replace(funcTarget, handleCreateEmpCode);
  console.log('Added handleCreateEmployee successfully');
} else {
  console.log('funcTarget not found');
}

// 3. Remove duplicate logo in sidebar
const duplicateLogo = `        {/* Logo */}
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
        </div>`;

if (code.includes(duplicateLogo)) {
  code = code.replace(duplicateLogo, '');
  console.log('Removed duplicate logo successfully');
} else {
  console.log('duplicateLogo block not found');
}

fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
