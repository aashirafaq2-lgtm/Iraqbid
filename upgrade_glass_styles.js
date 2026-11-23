const fs = require('fs');

let code = fs.readFileSync('admin-panel/src/App.jsx', 'utf8');

// 1. Upgrade root div to translucent overlay with glass styling
const rootTarget = "minHeight: '100vh', backgroundColor: '#060913', color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans, sans-serif'";
const rootRepl = "minHeight: '100vh', backgroundColor: 'transparent', color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans, sans-serif', position: 'relative'";

if (code.includes(rootTarget)) {
  code = code.replace(rootTarget, rootRepl);
  console.log('Upgraded root div to transparent for mesh gradient');
}

// 2. Upgrade Sidebar container to frosted glass
const sidebarTarget = `          width: sidebarOpen ? '280px' : '76px',
          minWidth: sidebarOpen ? '280px' : '76px',
          backgroundColor: '#0a0f1d',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '20px 12px',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
          zIndex: 50`;

const sidebarRepl = `          width: sidebarOpen ? '280px' : '76px',
          minWidth: sidebarOpen ? '280px' : '76px',
          backgroundColor: 'rgba(10, 15, 29, 0.7)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.09)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '20px 12px',
          boxShadow: '4px 0 32px rgba(0,0,0,0.6)',
          zIndex: 50`;

const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(code).includes(normalize(sidebarTarget))) {
  code = normalize(code).replace(normalize(sidebarTarget), sidebarRepl);
  console.log('Upgraded sidebar container to frosted glass');
} else {
  console.log('sidebarTarget not matched directly');
}

// 3. Upgrade Header bar to frosted glass
const headerTarget = `        <header style={{
          height: '64px',
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',`;

const headerRepl = `        <header style={{
          height: '64px',
          backgroundColor: 'rgba(10, 15, 29, 0.65)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',`;

if (normalize(code).includes(normalize(headerTarget))) {
  code = normalize(code).replace(normalize(headerTarget), headerRepl);
  console.log('Upgraded header bar to frosted glass');
} else {
  console.log('headerTarget not matched');
}

fs.writeFileSync('admin-panel/src/App.jsx', code, 'utf8');
