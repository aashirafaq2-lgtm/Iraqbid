const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

// 1. Add API_NOTIFICATIONS constant
const apiConstTarget = "const API_SPECIAL_BIDDERS = '/api/special-bidders';";
const apiConstRepl = `const API_SPECIAL_BIDDERS = '/api/special-bidders';\nconst API_NOTIFICATIONS = '/api/notifications';`;
if (code.includes(apiConstTarget) && !code.includes('API_NOTIFICATIONS')) {
  code = code.replace(apiConstTarget, apiConstRepl);
  console.log('Added API_NOTIFICATIONS');
}

// 2. Add Push Notifications module to newStaffPermissions list
const permTarget = "{ module: 'settings', label: '15. System Settings', icon: 'Settings', checked: false, level: '' }";
const permRepl = `{ module: 'settings', label: '15. System Settings', icon: 'Settings', checked: false, level: '' },
    { module: 'notifications', label: '16. Push Notifications', icon: 'Bell', checked: true, level: 'full' }`;
if (code.includes(permTarget) && !code.includes("label: '16. Push Notifications'")) {
  code = code.replace(permTarget, permRepl);
  console.log('Added 16. Push Notifications to newStaffPermissions');
}

// 3. Add Push Notification states and fetch function
const stateTarget = "const [settingsLoading, setSettingsLoading] = useState(false);";
const stateRepl = `const [settingsLoading, setSettingsLoading] = useState(false);

  // --- 16. PUSH NOTIFICATIONS MANAGEMENT ---
  const [broadcastForm, setPushBroadcastForm] = useState({
    title: '',
    message: '',
    image_url: '',
    destination_screen: 'home',
    related_id: ''
  });
  const [pushSending, setPushSending] = useState(false);
  const [pushHistory, setPushHistory] = useState([]);
  const [pushHistoryLoading, setPushHistoryLoading] = useState(false);
  const [pushActiveTab, setPushActiveTab] = useState('create'); // 'create' | 'history'

  const fetchPushHistory = async () => {
    setPushHistoryLoading(true);
    try {
      const res = await axios.get(\`\${API_NOTIFICATIONS}/broadcast-history?limit=50\`);
      if (res.data.success) {
        setPushHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching push history:', err);
    } finally {
      setPushHistoryLoading(false);
    }
  };

  const handleSendPushBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      alert('Please provide both notification title and message');
      return;
    }
    if (!window.confirm(\`Are you sure you want to send this push notification to ALL registered app users?\`)) {
      return;
    }
    setPushSending(true);
    try {
      const res = await axios.post(\`\${API_NOTIFICATIONS}/broadcast\`, broadcastForm);
      if (res.data.success) {
        alert(\`✅ Push Notification dispatched successfully to all users!\`);
        setPushBroadcastForm({
          title: '',
          message: '',
          image_url: '',
          destination_screen: 'home',
          related_id: ''
        });
        fetchPushHistory();
        setPushActiveTab('history');
      } else {
        alert(res.data.message || 'Failed to dispatch notification');
      }
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message);
    } finally {
      setPushSending(false);
    }
  };`;

if (code.includes(stateTarget) && !code.includes('handleSendPushBroadcast')) {
  code = code.replace(stateTarget, stateRepl);
  console.log('Added Push Notification states and functions');
}

// 4. Add Push Notifications to Sidebar (Item 16)
const sidebarTarget = `{/* 15. System Settings */}
          {canAccessCRM && (
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: activeTab === 'settings' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: activeTab === 'settings' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'settings' ? '600' : '500',
                fontSize: '13px'
              }}
            >
              <Settings size={18} />
              {sidebarOpen && <span>15. System Settings</span>}
            </button>
          )}`;

const sidebarRepl = `{/* 15. System Settings */}
          {canAccessCRM && (
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: activeTab === 'settings' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: activeTab === 'settings' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'settings' ? '600' : '500',
                fontSize: '13px'
              }}
            >
              <Settings size={18} />
              {sidebarOpen && <span>15. System Settings</span>}
            </button>
          )}

          {/* 16. Push Notifications (FCM Global Broadcast) */}
          {canAccessCRM && (
            <button
              onClick={() => {
                setActiveTab('push_notifications');
                fetchPushHistory();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: activeTab === 'push_notifications' ? '#ea580c' : 'transparent',
                backgroundImage: activeTab === 'push_notifications' ? 'linear-gradient(to right, #ea580c, #f97316)' : 'none',
                color: activeTab === 'push_notifications' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'push_notifications' ? '700' : '500',
                fontSize: '13px',
                boxShadow: activeTab === 'push_notifications' ? '0 4px 14px rgba(234, 88, 12, 0.35)' : 'none'
              }}
            >
              <Bell size={18} />
              {sidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <span>16. Push Notifications</span>
                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>FCM</span>
                </div>
              )}
            </button>
          )}`;

const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(code).includes(normalize(sidebarTarget))) {
  code = normalize(code).replace(normalize(sidebarTarget), sidebarRepl);
  console.log('Added 16. Push Notifications to sidebar');
} else {
  console.log('sidebarTarget not matched');
}

// 5. Add TAB 16 View in main viewport
const tabTarget = `{/* =====================================================================
            TAB 15: SYSTEM SETTINGS
           ===================================================================== */}`;

const tabViewCode = `{/* =====================================================================
            TAB 16: PUSH NOTIFICATIONS MANAGEMENT (FCM OVER-THE-AIR BROADCAST)
           ===================================================================== */}
        {activeTab === 'push_notifications' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={26} color="#f97316" /> Push Notifications Management
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Broadcast instant push alerts to ALL mobile users (Android & iOS) via Firebase Cloud Messaging.
                </p>
              </div>

              {/* Sub Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(16px)', padding: '5px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  onClick={() => setPushActiveTab('create')}
                  style={{
                    backgroundColor: pushActiveTab === 'create' ? '#ea580c' : 'transparent',
                    backgroundImage: pushActiveTab === 'create' ? 'linear-gradient(to right, #ea580c, #f97316)' : 'none',
                    color: pushActiveTab === 'create' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: pushActiveTab === 'create' ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={15} /> Send Notification
                </button>
                <button
                  onClick={() => {
                    setPushActiveTab('history');
                    fetchPushHistory();
                  }}
                  style={{
                    backgroundColor: pushActiveTab === 'history' ? '#6366f1' : 'transparent',
                    color: pushActiveTab === 'history' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: pushActiveTab === 'history' ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <History size={15} /> Notification History ({pushHistory.length})
                </button>
              </div>
            </div>

            {/* TAB 1: CREATE & BROADCAST NOTIFICATION */}
            {pushActiveTab === 'create' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 680px) minmax(280px, 380px)', gap: '24px', alignItems: 'start' }}>
                
                {/* Form Card */}
                <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
                  <form onSubmit={handleSendPushBroadcast}>
                    
                    {/* Title */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                        Notification Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. New Products Available!"
                        value={broadcastForm.title}
                        onChange={e => setPushBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Message Body */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                        Notification Message Body <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="e.g. New products have just been added to IRAQ BID. Open the app now and start bidding!"
                        value={broadcastForm.message}
                        onChange={e => setPushBroadcastForm({ ...broadcastForm, message: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>

                    {/* Optional Image URL */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                        Banner / Image URL <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourdomain.com/banner.jpg"
                        value={broadcastForm.image_url}
                        onChange={e => setPushBroadcastForm({ ...broadcastForm, image_url: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Destination Deep-Link */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                          Target Screen (Tap Action)
                        </label>
                        <select
                          value={broadcastForm.destination_screen}
                          onChange={e => setPushBroadcastForm({ ...broadcastForm, destination_screen: e.target.value })}
                          style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        >
                          <option value="home">Home Page</option>
                          <option value="auctions">Live Auctions</option>
                          <option value="wallet">User Wallet</option>
                          <option value="orders">My Orders</option>
                          <option value="product">Specific Product ID</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>
                          Related Entity ID <span style={{ color: '#64748b', fontSize: '11px' }}>(e.g. Product ID)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 42"
                          value={broadcastForm.related_id}
                          onChange={e => setPushBroadcastForm({ ...broadcastForm, related_id: e.target.value })}
                          style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Broadcast Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        Targeting ALL Installed App Users
                      </div>

                      <button
                        type="submit"
                        disabled={pushSending}
                        style={{
                          backgroundColor: '#ea580c',
                          backgroundImage: 'linear-gradient(to right, #ea580c, #f97316)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 32px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: pushSending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 8px 24px -4px rgba(234, 88, 12, 0.45)'
                        }}
                      >
                        {pushSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                        {pushSending ? 'Sending Over-The-Air...' : 'Send Notification Now'}
                      </button>
                    </div>

                  </form>
                </div>

                {/* Live Mobile Notification Preview Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Live Phone Lock-Screen Preview
                  </div>

                  <div style={{ backgroundColor: '#000000', borderRadius: '28px', padding: '24px 18px', border: '2px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                      <div style={{ width: '60px', height: '4px', backgroundColor: '#334155', borderRadius: '2px' }} />
                    </div>

                    {/* Notification Banner */}
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Gavel size={12} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1' }}>IRAQ BID</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>now</span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
                        {broadcastForm.title || 'New Products Available!'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                        {broadcastForm.message || 'New products have just been added to IRAQ BID. Open the app now and start bidding!'}
                      </div>

                      {broadcastForm.image_url && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', height: '110px' }}>
                          <img src={broadcastForm.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                      Supports both Android & iOS Lock Screen & Heads-Up Banner
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: NOTIFICATION HISTORY TABLE */}
            {pushActiveTab === 'history' && (
              <div className="glass-panel" style={{ borderRadius: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                      <th style={{ padding: '16px 20px' }}>Notification Title & Body</th>
                      <th style={{ padding: '16px 20px' }}>Target Destination</th>
                      <th style={{ padding: '16px 20px' }}>Targeted Count</th>
                      <th style={{ padding: '16px 20px' }}>Sent By</th>
                      <th style={{ padding: '16px 20px' }}>Date & Time</th>
                      <th style={{ padding: '16px 20px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                          No broadcast notifications sent yet. Use the "Send Notification" tab to dispatch your first push notification!
                        </td>
                      </tr>
                    ) : (
                      pushHistory.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '16px 20px', maxWidth: '340px' }}>
                            <div style={{ fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{b.title}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>{b.message}</div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
                              {b.destination_screen || 'Home'}
                              {b.related_id ? \` (#\${b.related_id})\` : ''}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: '700', color: '#f8fafc' }}>{b.targeted_count || b.success_count || 0} users</div>
                            <div style={{ fontSize: '11px', color: '#10b981' }}>Delivered</div>
                          </td>
                          <td style={{ padding: '16px 20px', color: '#cbd5e1' }}>
                            {b.sent_by_name || 'Super Admin'}
                          </td>
                          <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '12px' }}>
                            {new Date(b.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> Sent
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        `;

if (code.includes(tabTarget)) {
  code = code.replace(tabTarget, tabViewCode + '\n' + tabTarget);
  console.log('Added TAB 16 Push Notifications view to main container');
} else {
  console.log('tabTarget not found');
}

fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
console.log('App.jsx successfully patched with Push Notifications module!');
