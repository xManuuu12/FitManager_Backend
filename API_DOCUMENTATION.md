# 📚 Documentación de API FitManager SaaS

**Base URL:** `http://localhost:5000/api`  
**Formato de datos:** `JSON`  
**Autenticación:** JWT vía Header `Authorization: Bearer <token>` o Cookie `token`.

---

## 🔐 1. Autenticación (Auth)

### Registro (Onboarding SaaS)
*   **POST** `/auth/register`
*   **Body:**
    ```json
    {
      "nombre": "Admin Name",
      "email": "admin@gym.com",
      "password": "secret_password",
      "nombreGimnasio": "Laguna Fitness" 
    }
    ```

### Login
*   **POST** `/auth/login`
*   **Body:** 
    ```json
    {
      "email": "admin@gym.com", 
      "password": "secret_password"
    }
    ```
*   **Respuesta:** Devuelve `token` y objeto `user` (id_usuario, id_gimnasio, rol).

### Obtener Perfil (Me)
*   **GET** `/auth/me`
*   **Respuesta:** Datos del usuario autenticado y detalles de su gimnasio.

---

## 👥 2. Miembros (Members)

### Listar Miembros (Paginado)
*   **GET** `/members?page=1&limit=20`
*   **Respuesta:**
    ```json
    {
      "success": true,
      "count": 150,
      "totalPages": 8,
      "currentPage": 1,
      "data": [...]
    }
    ```

### Crear Miembro
*   **POST** `/members`
*   **Body:** 
    ```json
    {
      "nombre": "Juan", 
      "apellido": "Perez", 
      "telefono": "12345678"
    }
    ```

### Detalle, Actualizar y Borrar
*   **GET** `/members/:id`
*   **PUT** `/members/:id`
*   **DELETE** `/members/:id` (Realiza **Soft Delete**, el registro persiste pero se oculta).

---

## 💳 3. Pagos y Cobranza (Payments)

### Listar Pagos (Paginado)
*   **GET** `/payments?page=1&limit=10`
*   **Respuesta:** Historial cronológico (DESC) con relaciones incluidas.

### Alertas de Vencidos
*   **GET** `/payments/alerts`
*   **Descripción:** Miembros cuya membresía ha expirado según la lógica de negocio.

### Registrar Pago Manual (Efectivo/Transferencia)
*   **POST** `/payments`
*   **Body:**
    ```json
    {
      "id_miembro": 5,
      "id_membresia": 2,
      "monto": 500.00,
      "metodo_pago": "efectivo",
      "fecha_vencimiento": "2026-04-19"
    }
    ```
*   **Nota:** Esta operación es transaccional; activa automáticamente al miembro.

### Crear Intento de Pago (Stripe)
*   **POST** `/payments/create-intent`
*   **Body:** 
    ```json
    {
      "id_miembro": 5, 
      "id_membresia": 1, 
      "monto": 450
    }
    ```
*   **Respuesta:** `{"clientSecret": "pi_..."}`

---

## 🏋️ 4. Membresías (Planes)

### Listar Planes
*   **GET** `/membresias`

### Gestión de Planes (Solo Admin)
*   **POST** `/membresias`
*   **PUT** `/membresias/:id`
*   **DELETE** `/membresias/:id`
*   **Body:** 
    ```json
    {
      "nombre": "Mensualidad", 
      "precio": 450.00, 
      "duracion_dias": 30
    }
    ```

---

## 📱 5. Notificaciones (WhatsApp)

### Enviar Recordatorio
*   **POST** `/notifications/send-reminder/:id_miembro`
*   **Descripción:** Envía un mensaje predefinido vía WhatsApp Service.

---

## 🛡️ Manejo de Errores Estándar

Todas las respuestas fallidas siguen este formato:
```json
{
  "success": false,
  "error": "Mensaje descriptivo del error"
}
```
*   **401:** No autorizado (Token faltante o expirado).
*   **403:** Prohibido (El rol del usuario no tiene permisos para esta acción).
*   **404:** No encontrado (El recurso no existe o pertenece a otro gimnasio - Seguridad SaaS).
*   **400:** Solicitud incorrecta (Faltan campos obligatorios o error de validación).

---

### 💡 Tips para el Frontend:
1.  **JWT:** Inyecta el token en el header `Authorization: Bearer <token>` en cada petición.
2.  **Paginación:** Utiliza los campos `totalPages` y `currentPage` para renderizar la navegación.
3.  **Aislamiento:** El `id_gimnasio` es manejado internamente por el Backend; no es necesario enviarlo en los filtros del Front.
