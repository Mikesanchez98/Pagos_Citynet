// backend/services/mikrotik.js
// Conexión real al RouterOS API de MikroTik usando el paquete 'routeros'.
// En modo MOCK (sin contraseña real) devuelve datos simulados para desarrollo.

const { RouterOSAPI } = require('routeros');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

class MikrotikService {
  constructor() {
    this.conn = null;
    this.isConnected = false;
    // Modo MOCK si la contraseña no está configurada o tiene el marcador de ejemplo
    this.isMock =
      !process.env.MIKROTIK_PASSWORD ||
      process.env.MIKROTIK_PASSWORD.startsWith('CitynetADM') === false &&
      process.env.MIKROTIK_PASSWORD !== 'mock'
        ? false // Contraseña personalizada → conexión real
        : !process.env.MIKROTIK_HOST || process.env.MIKROTIK_HOST === '192.168.1.1'
          ? false  // Host configurado → intentar real
          : true;
  }

  // ── Conexión ─────────────────────────────────────────────

  async connect() {
    // Siempre intentar conexión real si hay credenciales
    try {
      if (this.conn) {
        try { await this.conn.close(); } catch {}
        this.conn = null;
      }

      this.conn = new RouterOSAPI({
        host:     process.env.MIKROTIK_HOST     || '192.168.1.1',
        user:     process.env.MIKROTIK_USER     || 'admin',
        password: process.env.MIKROTIK_PASSWORD || '',
        port:     parseInt(process.env.MIKROTIK_PORT) || 8728,
        timeout:  15
      });

      await this.conn.connect();
      this.isConnected = true;
      console.log(`✅ Conectado a MikroTik (${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_PORT || 8728})`);
      return true;
    } catch (error) {
      console.error('❌ No se pudo conectar a MikroTik:', error.message);
      console.warn('⚠️  Cambiando a modo MOCK para esta sesión');
      this.isConnected = false;
      this.conn = null;
      this.isMock = true;
      return false;
    }
  }

  async ensureConnected() {
    if (this.isMock) return true;
    if (!this.isConnected || !this.conn) {
      const ok = await this.connect();
      if (!ok) throw new Error('Sin conexión a MikroTik');
    }
    return true;
  }

  // ── Consultas ────────────────────────────────────────────

  async obtenerUsuariosPPPoE() {
    if (this.isMock) {
      return [
        { id: '*1', name: 'cityf001', password: 'pass123', profile: 'plan-10m', service: 'pppoe', disabled: false, comment: '' },
        { id: '*2', name: 'cityf002', password: 'pass456', profile: 'plan-20m', service: 'pppoe', disabled: true,  comment: '' },
      ];
    }

    await this.ensureConnected();
    const secrets = await this.conn.write('/ppp/secret/print');
    return secrets.map(s => ({
      id:       s['.id'],
      name:     s.name,
      password: s.password || '',
      profile:  s.profile  || 'default',
      service:  s.service  || 'pppoe',
      disabled: s.disabled === 'true',
      comment:  s.comment  || ''
    }));
  }

  async obtenerSesionesActivas() {
    if (this.isMock) {
      return [
        { usuario: 'cityf001', ip: '10.105.47.247', mac: 'AA:BB:CC:DD:EE:FF', interfaz: 'pppoe-server', uptime: '2d5h' }
      ];
    }

    await this.ensureConnected();
    const sessions = await this.conn.write('/ppp/active/print');
    return sessions.map(s => ({
      usuario: s.name,
      ip:      s.address       || null,
      mac:     s['caller-id'] || null,
      interfaz: s.interface   || null,
      uptime:  s.uptime        || null
    }));
  }

  // ── Acciones sobre usuarios PPPoE ───────────────────────

  async suspenderUsuario(mikrotikUser) {
    await this.registrarLog('suspend', mikrotikUser, 'attempt');
    try {
      if (this.isMock) {
        console.log(`⚠️  [MOCK] Suspendido: ${mikrotikUser}`);
        await this.registrarLog('suspend', mikrotikUser, 'success');
        return { success: true, mock: true };
      }

      await this.ensureConnected();
      const todos = await this.conn.write('/ppp/secret/print');
      const user  = todos.find(u => u.name === mikrotikUser);
      if (!user) throw new Error(`PPPoE secret "${mikrotikUser}" no encontrado en MikroTik`);

      await this.conn.write('/ppp/secret/set', [`=.id=${user['.id']}`, '=disabled=yes']);
      console.log(`✅ Suspendido en MikroTik: ${mikrotikUser}`);
      await this.registrarLog('suspend', mikrotikUser, 'success');
      return { success: true };
    } catch (error) {
      console.error(`❌ Error suspendiendo ${mikrotikUser}:`, error.message);
      await this.registrarLog('suspend', mikrotikUser, 'failed', error);
      throw error;
    }
  }

  async reactivarUsuario(mikrotikUser) {
    await this.registrarLog('reactivate', mikrotikUser, 'attempt');
    try {
      if (this.isMock) {
        console.log(`⚠️  [MOCK] Reactivado: ${mikrotikUser}`);
        await this.registrarLog('reactivate', mikrotikUser, 'success');
        return { success: true, mock: true };
      }

      await this.ensureConnected();
      const todos = await this.conn.write('/ppp/secret/print');
      const user  = todos.find(u => u.name === mikrotikUser);
      if (!user) throw new Error(`PPPoE secret "${mikrotikUser}" no encontrado en MikroTik`);

      await this.conn.write('/ppp/secret/set', [`=.id=${user['.id']}`, '=disabled=no']);
      console.log(`✅ Reactivado en MikroTik: ${mikrotikUser}`);
      await this.registrarLog('reactivate', mikrotikUser, 'success');
      return { success: true };
    } catch (error) {
      console.error(`❌ Error reactivando ${mikrotikUser}:`, error.message);
      await this.registrarLog('reactivate', mikrotikUser, 'failed', error);
      throw error;
    }
  }

  async crearUsuarioPPPoE(mikrotikUser, password, profile = 'default') {
    try {
      if (this.isMock) {
        console.log(`⚠️  [MOCK] PPPoE secret creado: ${mikrotikUser}`);
        return { success: true, mock: true };
      }

      await this.ensureConnected();
      await this.conn.write('/ppp/secret/add', [
        `=name=${mikrotikUser}`,
        `=password=${password}`,
        `=profile=${profile}`,
        '=service=pppoe'
      ]);
      console.log(`✅ PPPoE secret creado en MikroTik: ${mikrotikUser}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error creando ${mikrotikUser}:`, error.message);
      throw error;
    }
  }

  // ── Descubrimiento de infraestructura ───────────────────

  // Retorna interfaces activas (VLANs, bridges) candidatas para ser Antenas
  async obtenerInterfaces() {
    if (this.isMock) {
      return [
        { name: 'vlan110', type: 'vlan',   running: true,  comment: 'Sector Norte'  },
        { name: 'vlan120', type: 'vlan',   running: true,  comment: 'Sector Sur'    },
        { name: 'vlan130', type: 'vlan',   running: false, comment: 'Sector Este'   },
        { name: 'bridge1', type: 'bridge', running: true,  comment: ''              },
      ];
    }

    await this.ensureConnected();
    const all = await this.conn.write('/interface/print');
    // Filtrar solo tipos útiles para clientes (vlan, bridge, pppoe-server, ether)
    const tiposInteres = ['vlan', 'bridge', 'pppoe-server', 'ether', 'bonding'];
    return all
      .filter(i => tiposInteres.includes(i.type))
      .map(i => ({
        name:    i.name,
        type:    i.type,
        running: i.running === 'true',
        comment: i.comment || ''
      }));
  }

  // Retorna IPs asignadas a cada interface → define subred de cada antena
  async obtenerIPAddresses() {
    if (this.isMock) {
      return [
        { interface: 'vlan110', address: '10.105.110.1/24', network: '10.105.110.0' },
        { interface: 'vlan120', address: '10.105.120.1/24', network: '10.105.120.0' },
        { interface: 'bridge1', address: '192.168.88.1/24', network: '192.168.88.0' },
      ];
    }

    await this.ensureConnected();
    const ips = await this.conn.write('/ip/address/print');
    return ips.map(ip => ({
      interface: ip.interface,
      address:   ip.address,          // e.g. "10.105.110.1/24"
      network:   ip.network || null   // e.g. "10.105.110.0"
    }));
  }

  // Sesiones activas incluyendo la interface de cada sesión
  async obtenerSesionesConDetalle() {
    if (this.isMock) {
      return [
        { usuario: 'cityf001', ip: '10.105.110.5',  mac: 'AA:BB:CC:DD:EE:01', interfaz: 'vlan110', uptime: '2d5h'  },
        { usuario: 'cityf002', ip: '10.105.120.12', mac: 'AA:BB:CC:DD:EE:02', interfaz: 'vlan120', uptime: '1d3h'  },
      ];
    }

    await this.ensureConnected();
    const sessions = await this.conn.write('/ppp/active/print');
    return sessions.map(s => ({
      usuario:  s.name,
      ip:       s.address       || null,
      mac:      s['caller-id'] || null,
      interfaz: s.interface    || null,
      uptime:   s.uptime        || null
    }));
  }

  // ── Estado y diagnóstico ─────────────────────────────────

  async healthCheck() {
    if (this.isMock) return { ok: true, mock: true, mensaje: 'Modo MOCK activo' };
    try {
      await this.ensureConnected();
      const [info] = await this.conn.write('/system/identity/print');
      return { ok: true, mock: false, identity: info?.name || 'MikroTik' };
    } catch (error) {
      return { ok: false, mock: false, error: error.message };
    }
  }

  // ── Log ──────────────────────────────────────────────────

  async registrarLog(accion, cliente, estado, error = null) {
    try {
      await db.mikrotikLog.create({
        data: {
          accion,
          cliente:  String(cliente),
          router:   process.env.MIKROTIK_HOST || 'router1',
          estado,
          error:    error?.message || null
        }
      });
    } catch (e) {
      console.error('[MikroTik] Error en log:', e.message);
    }
  }

  async disconnect() {
    try {
      if (this.conn) {
        await this.conn.close();
        this.conn = null;
      }
      this.isConnected = false;
    } catch {}
  }
}

module.exports = new MikrotikService();
