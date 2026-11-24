// Node 26 Windows runners may not expose a passwd database; tsx uses userInfo
// only to derive its temporary IPC directory name in that environment.
const os = require('node:os');

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ username: process.env.USERNAME || 'node' });
}

require('tsx/cjs');
