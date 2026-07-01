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
    this.isMock =
      !process.env.MIKROTIK_PASSWORD ||
      process.env.MIKROTIK_PASSWORD.startsWith('CitynetADM') === false &&
      process.env.MIKROTIK_PASSWORD !== 'mock'
        ? false
        : !process.env.MIKROTIK_HOST || process.env.MIKROTIK_HOST === '192.168.1.1'
          ? false
          : true;

    // Caché en memoria para leases DHCP — se sirve mientras se reconecta
    this._leasesCache  = null;
    this._leasesCacheTs = 0;
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
        timeout:  10  // segundos
      });

      // Timeout externo de 12 segundos para evitar que TCP cuelgue indefinidamente
      await Promise.race([
        this.conn.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de conexión a MikroTik (12s)')), 12000)
        )
      ]);
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

  // Wrapper con timeout para evitar que writes en conexiones muertas cuelguen
  async _write(command, timeoutMs = 10000) {
    return Promise.race([
      this.conn.write(command),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de escritura MikroTik (${timeoutMs / 1000}s)`)), timeoutMs)
      )
    ]);
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
    const secrets = await this._write('/ppp/secret/print');
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

  async obtenerLeasesDHCP() {
    if (this.isMock) {
      // Si hay caché real previa, devolverla aunque estemos en MOCK temporal
      if (this._leasesCache) return this._leasesCache;
      return [
        { mac: 'AA:BB:CC:11:22:33', ip: '192.168.1.100', hostname: 'cliente-001', servidor: 'dhcp1', estado: 'bound',   comentario: 'Juan Perez',  deshabilitado: false },
        { mac: 'AA:BB:CC:44:55:66', ip: '192.168.1.101', hostname: 'cliente-002', servidor: 'dhcp1', estado: 'bound',   comentario: 'Maria Garcia', deshabilitado: false },
        { mac: 'AA:BB:CC:77:88:99', ip: '192.168.1.102', hostname: '',            servidor: 'dhcp2', estado: 'waiting', comentario: '',             deshabilitado: true  },
      ];
    }

    const parsearLeases = (raw) => raw
      .filter(l => l['mac-address'])
      .map(l => ({
        mac:           l['mac-address']    || '',
        ip:            l['active-address'] || l.address || '',
        hostname:      l['host-name']      || '',
        servidor:      l['active-server']  || l.server  || '',
        estado:        l.status            || 'waiting',
        comentario:    l.comment           || '',
        deshabilitado: l.disabled === 'true'
      }));

    // Primer intento
    try {
      await this.ensureConnected();
      const raw    = await this._write('/ip/dhcp-server/lease/print');
      const result = parsearLeases(raw);
      this._leasesCache   = result;
      this._leasesCacheTs = Date.now();
      return result;
    } catch {
      // Conexión caída — reconectar y reintentar una vez
      this.isConnected = false;
      this.conn = null;
    }

    console.warn('⚠️ Conexión caída — reconectando y reintentando...');
    try {
      const ok = await this.connect();
      if (!ok) throw new Error('Reconexión fallida');
      const raw    = await this._write('/ip/dhcp-server/lease/print');
      const result = parsearLeases(raw);
      this._leasesCache   = result;
      this._leasesCacheTs = Date.now();
      return result;
    } catch (retryError) {
      // Devolver caché si tiene menos de 10 minutos
      const cacheAge = Date.now() - this._leasesCacheTs;
      if (this._leasesCache && cacheAge < 600000) {
        console.warn(`⚠️ Reintento fallido — sirviendo caché (${Math.round(cacheAge / 1000)}s de antigüedad)`);
        return this._leasesCache;
      }
      throw retryError;
    }
  }

  async obtenerSesionesActivas() {
    if (this.isMock) {
      return [
        { usuario: 'cityf001', ip: '10.105.47.247', mac: 'AA:BB:CC:DD:EE:FF', interfaz: 'pppoe-server', uptime: '2d5h' }
      ];
    }

    await this.ensureConnected();
    const sessions = await this._write('/ppp/active/print');
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
      const todos = await this._write('/ppp/secret/print');
      const user  = todos.find(u => u.name === mikrotikUser);
      if (!user) throw new Error(`PPPoE secret "${mikrotikUser}" no encontrado en MikroTik`);

      await this._write('/ppp/secret/set', [`=.id=${user['.id']}`, '=disabled=yes']);
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
      const todos = await this._write('/ppp/secret/print');
      const user  = todos.find(u => u.name === mikrotikUser);
      if (!user) throw new Error(`PPPoE secret "${mikrotikUser}" no encontrado en MikroTik`);

      await this._write('/ppp/secret/set', [`=.id=${user['.id']}`, '=disabled=no']);
      console.log(`✅ Reactivado en MikroTik: ${mikrotikUser}`);
      await this.registrarLog('reactivate', mikrotikUser, 'success');
      return { success: true };
    } catch (error) {
      console.error(`❌ Error reactivando ${mikrotikUser}:`, error.message);
      await this.registrarLog('reactivate', mikrotikUser, 'failed', error);
      throw error;
    }
  }

  // ── Suspensión por IP (clientes sin PPPoE — DHCP/MAC) ───
  // Usa una address-list de firewall ('clientes-suspendidos' por defecto) +
  // una regla forward que la dropea. La regla se crea una sola vez si falta.

  get listaSuspendidos() {
    return process.env.MIKROTIK_ADDRESS_LIST || 'clientes-suspendidos';
  }

  async asegurarReglaFirewall() {
    if (this.isMock) return;
    await this.ensureConnected();
    const reglas = await this._write('/ip/firewall/filter/print');
    const yaExiste = reglas.some(r =>
      r.chain === 'forward' &&
      r.action === 'drop' &&
      r['src-address-list'] === this.listaSuspendidos
    );
    if (!yaExiste) {
      await this._write('/ip/firewall/filter/add', [
        '=chain=forward',
        `=src-address-list=${this.listaSuspendidos}`,
        '=action=drop',
        '=comment=Corte automático de clientes suspendidos (Pagos Citynet)'
      ]);
      console.log(`✅ Regla de firewall creada para lista "${this.listaSuspendidos}"`);
    }
  }

  async suspenderPorIp(ip) {
    await this.registrarLog('suspend-ip', ip, 'attempt');
    try {
      if (this.isMock) {
        console.log(`⚠️  [MOCK] Suspendido por IP: ${ip}`);
        await this.registrarLog('suspend-ip', ip, 'success');
        return { success: true, mock: true };
      }

      await this.ensureConnected();
      await this.asegurarReglaFirewall();

      const existentes   = await this._write('/ip/firewall/address-list/print');
      const yaSuspendido = existentes.find(e => e.list === this.listaSuspendidos && e.address === ip);
      if (!yaSuspendido) {
        await this._write('/ip/firewall/address-list/add', [
          `=list=${this.listaSuspendidos}`,
          `=address=${ip}`,
          '=comment=Suspendido por sistema de pagos'
        ]);
      }

      console.log(`✅ Suspendido en MikroTik (IP): ${ip}`);
      await this.registrarLog('suspend-ip', ip, 'success');
      return { success: true };
    } catch (error) {
      console.error(`❌ Error suspendiendo IP ${ip}:`, error.message);
      await this.registrarLog('suspend-ip', ip, 'failed', error);
      throw error;
    }
  }

  async reactivarPorIp(ip) {
    await this.registrarLog('reactivate-ip', ip, 'attempt');
    try {
      if (this.isMock) {
        console.log(`⚠️  [MOCK] Reactivado por IP: ${ip}`);
        await this.registrarLog('reactivate-ip', ip, 'success');
        return { success: true, mock: true };
      }

      await this.ensureConnected();
      const existentes = await this._write('/ip/firewall/address-list/print');
      const entrada     = existentes.find(e => e.list === this.listaSuspendidos && e.address === ip);
      if (entrada) {
        await this._write('/ip/firewall/address-list/remove', [`=.id=${entrada['.id']}`]);
      }

      console.log(`✅ Reactivado en MikroTik (IP): ${ip}`);
      await this.registrarLog('reactivate-ip', ip, 'success');
      return { success: true };
    } catch (error) {
      console.error(`❌ Error reactivando IP ${ip}:`, error.message);
      await this.registrarLog('reactivate-ip', ip, 'failed', error);
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
      await this._write('/ppp/secret/add', [
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
    const all = await this._write('/interface/print');
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
    const ips = await this._write('/ip/address/print');
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
    const sessions = await this._write('/ppp/active/print');
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
      const [info] = await this._write('/system/identity/print');
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
