// Antivírus opcional (ClamAV via clamd, protocolo INSTREAM). Ative com CLAMAV_HOST.
import net from 'node:net';
import { config } from '../config.js';

export async function scanWithClamAV(buffer) {
  const { clamavHost: host, clamavPort: port, clamavRequired: required } = config.security;
  if (!host) return { status: 'skipped' };
  try {
    const reply = await new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let out = '';
      sock.setTimeout(30000, () => { sock.destroy(); reject(new Error('timeout')); });
      sock.on('error', reject);
      sock.on('data', (d) => { out += d.toString(); });
      sock.on('end', () => resolve(out.trim()));
      sock.on('connect', () => {
        sock.write('zINSTREAM\0');
        for (let i = 0; i < buffer.length; i += 64 * 1024) {
          const chunk = buffer.subarray(i, i + 64 * 1024);
          const len = Buffer.alloc(4); len.writeUInt32BE(chunk.length);
          sock.write(len); sock.write(chunk);
        }
        sock.end(Buffer.alloc(4));
      });
    });
    if (/FOUND/.test(reply)) return { status: 'infected', signature: reply.replace(/^stream:\s*/, '').replace(/\s*FOUND\0?$/, '') };
    if (/OK/.test(reply)) return { status: 'clean' };
    return { status: required ? 'error' : 'skipped', error: reply };
  } catch (e) {
    return { status: required ? 'error' : 'skipped', error: e.message };
  }
}
