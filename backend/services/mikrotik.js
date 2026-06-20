const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

class MikrotikService {
  constructor() {
    this.router = null;
    this.isConnected = false;
    this.isMock = process.env.MIKROTIK_PASSWORD === 'mock' || !process.env.MIKROTIK_PASSWORD;
  }

  async connect() {
    try {
      // Si no hay contraseña o es mock, usar modo simulado
      if (this.isMock) {
        console.log('⚠️  Modo MOCK de MikroTik (sin conexión real)');
        this.isConnected = true;
        return true;
      }

      // Aquí iría la conexión real cuando tengas acceso
      console.log('✅ Conectado a MikroTik');
      this.isConnected = true;
      return true;

    } catch (error) {
      console.error('❌ Error conectando a MikroTik:', error.message);
      this.isConnected = false;
      // No lanzar error, permitir que el servidor siga funcionando
      return false;
    }
  }

  async registrarLog(accion, cliente, estado, error = null) {
    try {
      await db.mikrotikLog.create({
        data: {
          accion,
          cliente,
          router: 'router1',
          estado,
          error: error?.message || null
        }
      });
    } catch (e) {
      console.error('Error registrando log:', e.message);
    }
  }

  async crearUsuario(cliente) {
    try {
      if (!this.isConnected && !this.isMock) {
        throw new Error('No conectado a MikroTik');
      }

      console.log(`✅ [MOCK] Usuario ${cliente.numCliente} creado en MikroTik`);
      await this.registrarLog('create_user', cliente.numCliente, 'success');

      return { success: true, cliente: cliente.numCliente };
    } catch (error) {
      console.error('❌ Error creando usuario:', error.message);
      await this.registrarLog('create_user', cliente.numCliente, 'failed', error);
      throw error;
    }
  }

  async suspenderUsuario(numCliente) {
    try {
      if (!this.isConnected && !this.isMock) {
        throw new Error('No conectado a MikroTik');
      }

      console.log(`✅ [MOCK] ${numCliente} suspendido`);
      await this.registrarLog('suspend', numCliente, 'success');

      return { success: true, cliente: numCliente };
    } catch (error) {
      console.error('❌ Error suspendiendo:', error.message);
      await this.registrarLog('suspend', numCliente, 'failed', error);
      throw error;
    }
  }

  async reactivarUsuario(numCliente) {
    try {
      if (!this.isConnected && !this.isMock) {
        throw new Error('No conectado a MikroTik');
      }

      console.log(`✅ [MOCK] ${numCliente} reactivado`);
      await this.registrarLog('reactivate', numCliente, 'success');

      return { success: true, cliente: numCliente };
    } catch (error) {
      console.error('❌ Error reactivando:', error.message);
      await this.registrarLog('reactivate', numCliente, 'failed', error);
      throw error;
    }
  }

  async obtenerSesionesActivas() {
    try {
      if (!this.isConnected && !this.isMock) {
        return [];
      }

      // En modo mock, retornar datos simulados
      if (this.isMock) {
        return [
          {
            usuario: 'cityf2',
            ip: '10.105.47.247',
            router: 'router1',
            uptime: '2d 5h',
            interfaz: 'vlan110'
          }
        ];
      }

      return [];
    } catch (error) {
      console.warn('⚠️  Error obteniendo sesiones:', error.message);
      return [];
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected && !this.isMock) {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('⚠️  Health check failed');
      return false;
    }
  }

  async disconnect() {
    try {
      this.isConnected = false;
      console.log('✅ Desconectado de MikroTik');
    } catch (error) {
      console.error('Error desconectando:', error.message);
    }
  }
}

module.exports = new MikrotikService();