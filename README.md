# 🌐 Citynet Pagos — Portal de Clientes y Administración

**Sistema integral de facturación, pagos y gestión de servicios para Citynet Telecomunicaciones**

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Para Clientes](#para-clientes)
4. [Para Administradores](#para-administradores)
5. [Características Principales](#características-principales)
6. [Preguntas Frecuentes](#preguntas-frecuentes)
7. [Soporte Técnico](#soporte-técnico)

---

## 📱 Descripción General

**Citynet Pagos** es una plataforma digital diseñada para:

- ✅ **Clientes** — Ver facturas, realizar pagos en línea y consultar estado de servicios
- ✅ **Administradores** — Gestionar clientes, servicios, facturación y cobros
- ✅ **Automatización** — Facturación automática, suspensión de servicios y notificaciones

### Tecnología

- **Backend:** Node.js + Express (API REST segura)
- **Frontend:** React 19 + Vite (interfaz moderna)
- **Base de Datos:** PostgreSQL en Supabase (en la nube)
- **Pagos:** Openpay (integración con tarjetas de crédito)
- **Alojamiento:** Vercel (servidores globales)

---

## 🔐 Acceso al Sistema

### URLs de Acceso

**Portal de Clientes:**
```
https://citynet-frontend.vercel.app
```

**Panel de Administración:**
```
https://citynet-frontend.vercel.app/admin
```

### Credenciales

Al iniciar sesión, ingresa:
- **Usuario:** Tu nombre de usuario (asignado por Citynet)
- **Contraseña:** Tu contraseña segura (hasheada con bcrypt)

**Nota:** Si no recuerdas tu contraseña, contacta al equipo de soporte.

---

## 👥 Para Clientes

### 📊 Dashboard — Tu Panel Principal

Al ingresar verás:

1. **Estado de tu Cuenta**
   - Monto pendiente de pago
   - Fecha de próximo vencimiento
   - Estado de servicios (ACTIVO / SUSPENDIDO)

2. **Tus Servicios**
   - Dirección de instalación
   - IP asignada
   - Plan contratado
   - Velocidad de internet

3. **Historial de Pagos**
   - Facturas pendientes
   - Pagos realizados
   - Descargas de comprobantes (PDF)

### 💳 Realizar un Pago

#### Paso 1: Verificar Deuda
En el dashboard verifica tu **Monto Pendiente**. Si es $0.00, tu cuenta está al día.

#### Paso 2: Click en "PAGAR AHORA"
El botón azul te llevará a la pasarela de pagos (Openpay).

#### Paso 3: Completar Pago
- Ingresa datos de tu tarjeta de crédito
- Autoriza el cobro
- Recibirás confirmación inmediata

#### Paso 4: Descargar Comprobante
Una vez pagado, descarga tu recibo en PDF desde el historial.

### ✅ Métodos de Pago Aceptados

- 💳 **Tarjetas de Crédito** (Visa, Mastercard, American Express)
- 🏦 **Transferencias Bancarias** (previa coordinación)
- 💰 **Efectivo** (en oficinas Citynet)

---

## 🛠️ Para Administradores

### 🏠 Panel Administrativo

Accede a: `https://citynet-frontend.vercel.app/admin`

### 📝 Gestión de Clientes

#### Crear Cliente
1. Ve a **Clientes → Agregar Cliente**
2. Completa los datos:
   - Nombre completo
   - Número de cliente (único)
   - Email (opcional)
   - Teléfono
   - Dirección

#### Editar Cliente
1. Ve a **Clientes**
2. Busca y selecciona el cliente
3. Modifica los datos necesarios
4. Guarda cambios

#### Ver Detalles
Haz click en cualquier cliente para ver:
- Servicios activos
- Facturas pendientes
- Historial de pagos
- Tickets de soporte

### 🔧 Gestión de Servicios

#### Crear Servicio
1. Ve a **Servicios**
2. Click en **Nuevo Servicio**
3. Selecciona cliente y plan
4. Asigna torre y ubicación
5. Activa el servicio

#### Estados de Servicio
- **ACTIVO** — Servicio funcionando normalmente
- **SUSPENDIDO** — Suspenso por falta de pago
- **INACTIVO** — Servicio desactivado

### 📊 Facturación

#### Generar Facturas
Las facturas se generan **automáticamente** el día configurado (1 o 15 de cada mes).

#### Editar Factura
1. Ve a **Cobranza**
2. Selecciona la factura
3. Modifica monto o vencimiento si es necesario

#### Marcar como Pagada
Cuando un cliente paga fuera de línea:
1. Busca la factura
2. Marca como "Pagada"
3. Registra el método de pago

### 🗼 Gestión de Torres

#### Ver Torres
Ve a **Torres** para ver todas las torres en el mapa.

#### Crear Torre
1. Click en **Nueva Torre**
2. Ingresa nombre, latitud y longitud
3. Visualiza en el mapa
4. Guarda

#### Editar Torre
Haz click en una torre para:
- Cambiar nombre
- Actualizar coordenadas
- Ver servicios conectados

### 📦 Planes y Paquetes

#### Ver Planes
Ve a **Paquetes** para ver todos los planes disponibles.

#### Crear Nuevo Plan
1. Click en **Nuevo Paquete**
2. Completa:
   - Nombre (ej: "Básico 10 Mbps")
   - Velocidad (en Mbps)
   - Precio mensual
   - Descripción
3. Guarda

#### Editar Plan
Haz click en un plan para modificar velocidad o precio.

### 📧 Notificaciones

#### WhatsApp Masivo
Envía mensajes a múltiples clientes:
1. Ve a **Cobranza**
2. Selecciona clientes
3. Click en **Enviar WhatsApp**
4. Redacta tu mensaje
5. Envía

#### Contenido Automático
- Recordatorios de vencimiento
- Confirmaciones de pago
- Notificaciones de suspensión

### 📋 Reportes

#### Ingresos por Mes
- Visualiza gráficos de cobranza
- Compara meses anteriores
- Exporta datos en Excel

#### Clientes por Estado
- Activos / Suspendidos / Inactivos
- Deuda total pendiente
- Clientes al día

---

## 🌟 Características Principales

### 🔒 Seguridad

- ✅ Encriptación end-to-end (HTTPS)
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación JWT (tokens seguros)
- ✅ Rate limiting (máximo 5 intentos de login)
- ✅ Base de datos en nube segura (Supabase)

### ⚙️ Automatización

- ✅ **Facturación automática** — Genera facturas el día configurado
- ✅ **Suspensión automática** — Suspende servicios en vencimiento
- ✅ **Cálculo de saldo** — Aplica pagos parciales automáticamente
- ✅ **Cascada de pagos** — Paga facturas más antiguas primero

### 💳 Pagos en Línea

- ✅ Integración Openpay (producción y sandbox)
- ✅ Transacciones seguras HMAC-SHA256
- ✅ Webhooks para confirmaciones
- ✅ Recibos automáticos en PDF

### 📍 Geolocalización

- ✅ Mapa interactivo de torres
- ✅ Visualización de servicios por zona
- ✅ Coordenadas GPS exactas

### 📱 Responsive

- ✅ Funciona en PC, tablet y móvil
- ✅ Interfaz adaptable
- ✅ Acceso desde cualquier navegador

---

## ❓ Preguntas Frecuentes

### Clientes

**P: ¿Cómo cambio mi contraseña?**
R: Por seguridad, contacta al equipo de soporte. No puedes cambiarla desde el portal.

**P: ¿Puedo pagar una parte de mi deuda?**
R: Sí. El sistema acepta pagos parciales y aplica el dinero automáticamente a las facturas más antiguas.

**P: ¿Qué sucede si mi cuenta se suspende?**
R: Tu servicio de internet se desactiva. Para reactivar, debe estar al día o hacer un pago que cubra la deuda.

**P: ¿Cuánto tarda en procesarse mi pago?**
R: Los pagos se procesan inmediatamente. Recibirás confirmación al instante.

**P: ¿Cómo descargo mi comprobante de pago?**
R: En el dashboard, ve a tu historial de pagos y haz click en el botón "📄 PDF".

**P: ¿Cuál es el día de corte de mi factura?**
R: Se factura el **1° o 15° de cada mes** según lo configurado en tu cuenta.

---

### Administradores

**P: ¿Cómo creo un nuevo usuario administrador?**
R: Los usuarios se crean en la base de datos. Contacta al equipo técnico.

**P: ¿Puedo editar una factura después de emitida?**
R: Sí, pero solo el monto y la fecha de vencimiento. Los cambios se registran en el historial.

**P: ¿Qué significa "servicioId" en los errores?**
R: Es un identificador técnico. Si ves este error, contacta a soporte técnico.

**P: ¿Puedo exportar reportes?**
R: Los reportes están disponibles en pantalla. Para exportar en Excel, contacta a soporte.

**P: ¿Cómo envío mensajes de WhatsApp a clientes?**
R: Ve a **Cobranza → Enviar WhatsApp**. Selecciona clientes y redacta tu mensaje.

**P: ¿Qué pasa si un cliente paga fuera del sistema?**
R: Marcha la factura como "Pagada" manualmente en el sistema y registra el método de pago.

---

## 📞 Soporte Técnico

### Reportar un Problema

Si encuentras un error:

1. **Anota el error exacto** que ves en pantalla
2. **Captura una screenshot** (Impr Pant)
3. **Anota qué ibas a hacer** cuando pasó
4. **Contacta a soporte:**

**Email:** soporte@citynet.mx
**Teléfono:** +52 (XXX) XXX-XXXX
**Horario:** Lunes a Viernes, 8 AM - 6 PM (Hora Central)

### Errores Comunes y Soluciones

#### ❌ "Error al conectar con el servidor"
**Solución:** 
- Verifica tu conexión a internet
- Limpia el caché: `Ctrl + Shift + Supr`
- Intenta en otro navegador

#### ❌ "Usuario no encontrado"
**Solución:**
- Verifica que escribiste bien tu usuario
- Las mayúsculas/minúsculas importan
- Contacta a soporte si no recuerdas tu usuario

#### ❌ "Contraseña incorrecta"
**Solución:**
- Intenta 3 veces máximo
- Después espera 15 minutos
- Contacta a soporte para resetear

#### ❌ "No tienes permiso para acceder"
**Solución:**
- Si eres cliente, no accedas a `/admin`
- Si eres admin, verifica tu rol en la BD
- Contacta a soporte

---

## 📅 Roadmap Futuro

### Próximas Mejoras (Julio 2026)

- [ ] App móvil (iOS y Android)
- [ ] Integración con más pasarelas de pago
- [ ] Chatbot de soporte 24/7
- [ ] Reportes avanzados en PDF
- [ ] Historial de cambios en auditoría

### Retroalimentación

¿Tienes sugerencias? Envía un email a: **feedback@citynet.mx**

---

## 🔧 Información Técnica

### Componentes del Sistema

| Componente | Detalles | URL |
|-----------|---------|-----|
| **Frontend** | React 19, Vite, Tailwind CSS | https://citynet-frontend.vercel.app |
| **Backend API** | Node.js Express, Prisma | https://pagos-citynet.vercel.app/api |
| **Base de Datos** | PostgreSQL (Supabase) | aws-1-us-east-2.pooler.supabase.com |
| **Pagos** | Openpay (Sandbox/Producción) | openpay.mx |
| **Hosting** | Vercel (Deployments automáticos) | vercel.com |

### Requisitos Técnicos Mínimos

- **Navegadores soportados:** Chrome, Firefox, Safari, Edge (versiones recientes)
- **Conexión:** Internet de al menos 1 Mbps
- **Dispositivos:** PC, tablet, smartphone
- **JavaScript:** Debe estar habilitado

---

## 📄 Política de Privacidad y Términos

### Datos Personales

Citynet protege tu información:
- No vendemos datos a terceros
- Solo usamos datos para facturación y comunicación
- Tu contraseña está encriptada

### Términos de Servicio

Al usar Citynet Pagos aceptas:
- Los términos de servicio de Citynet
- La política de privacidad
- Los términos de la pasarela de pagos (Openpay)

Para más detalles, contacta a: **legal@citynet.mx**

---

## 📞 Contacto

**Citynet Telecomunicaciones**

- 📧 Email: soporte@citynet.mx
- 📱 WhatsApp: +52 (XXX) XXX-XXXX
- 🌐 Web: www.citynet.mx
- 📍 Oficinas: [Dirección principal]

**Horario de Atención:**
- Lunes a Viernes: 8:00 AM - 6:00 PM
- Sábados: 9:00 AM - 1:00 PM
- Domingos: Cerrado

---

## ✅ Versión del Sistema

- **Versión:** 1.0.0 (Inicial)
- **Fecha de Lanzamiento:** Junio 16, 2026
- **Última Actualización:** Junio 16, 2026
- **Estado:** Producción ✅

---

**Gracias por usar Citynet Pagos. Si tienes preguntas, no dudes en contactar a nuestro equipo de soporte.** 🚀

*Citynet Telecomunicaciones © 2026. Todos los derechos reservados.*
