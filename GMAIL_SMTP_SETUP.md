# Configuración de Gmail SMTP para Envío de Emails

## ✅ Estado Actual

El sistema está **casi listo** para usar Gmail SMTP. Solo necesitas generar un **App Password** de Gmail.

## 🔐 Paso 1: Generar App Password de Gmail

### Opción A: Acceso Directo (Recomendado)

1. **Ve directamente a:** https://myaccount.google.com/apppasswords

2. **Si te pide iniciar sesión:**
   - Usa tu cuenta: **jose890823@gmail.com**
   - Ingresa tu contraseña normal

3. **Si te dice "This setting is not available for accounts with 2-Step Verification turned off":**
   - Primero debes habilitar la verificación en 2 pasos (ver Opción B)

4. **Si ya tienes 2FA habilitado:**
   - Dale click en "Create" o "Generar"
   - Nombre de la app: "Emigrantes FT Backend"
   - Copia el código de 16 dígitos que te da (algo como: `abcd efgh ijkl mnop`)
   - **IMPORTANTE:** Guarda este código, lo necesitarás en el siguiente paso

### Opción B: Activar 2FA Primero (Si no lo tienes)

1. **Ve a:** https://myaccount.google.com/signinoptions/two-step-verification

2. **Haz click en "Get Started" o "Comenzar"**

3. **Sigue los pasos:**
   - Verifica tu número de teléfono
   - Recibirás un código por SMS
   - Confírma el código

4. **Una vez activado 2FA, vuelve al Paso 1 (Opción A)**

### Opción C: Navegación Manual

Si ninguna de las opciones anteriores funciona:

1. Ve a: https://myaccount.google.com/
2. Click en "Security" (Seguridad) en el menú lateral
3. Scroll hasta "How you sign in to Google"
4. Click en "2-Step Verification" (Verificación en 2 pasos)
5. Si no está activo, actívalo
6. Una vez activo, verás "App passwords" (Contraseñas de aplicaciones)
7. Click en "App passwords"
8. Genera una nueva contraseña para "Mail" y "Other device"
9. Nombre: "Emigrantes FT Backend"

## 📝 Paso 2: Configurar el Backend

Una vez que tengas tu App Password:

1. **Abre el archivo `.env` en la raíz del proyecto**

2. **Busca esta línea:**
   ```bash
   GMAIL_APP_PASSWORD=PENDIENTE_CONFIGURAR
   ```

3. **Reemplázala con tu App Password:**
   ```bash
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```

   **IMPORTANTE:**
   - Copia el código EXACTAMENTE como te lo da Gmail
   - Puede tener espacios o no, ambos formatos funcionan
   - Es case-sensitive (distingue mayúsculas/minúsculas)

4. **Guarda el archivo `.env`**

## 🚀 Paso 3: Reiniciar el Servidor

El servidor se reiniciará automáticamente cuando guardes el `.env`.

Verifica en los logs que veas:

```
✅ EmailService configurado correctamente con Gmail SMTP
📧 Usando cuenta: jose890823@gmail.com
```

## 🧪 Paso 4: Probar el Sistema

Una vez configurado, ejecuta el script de prueba:

```bash
bash /tmp/test_notifications.sh
```

Esto enviará 15 emails de prueba a:
- **josemx890823@gmail.com** (correo del cliente)
- **jose890823@gmail.com** (correo del admin - TU correo)

## ✅ Verificación Final

Deberías recibir emails en ambas cuentas:

### En josemx890823@gmail.com (Cliente):
- POA Enviado
- POA Asignado
- POA En Revisión
- POA Aprobado
- POA Rechazado
- POA Notarizado
- POA Activado
- POA Ejecutado
- POA Completado
- Documento Subido
- Documento Aprobado
- Documento Rechazado
- Mensaje Recibido (de Admin)

### En jose890823@gmail.com (Admin):
- POA Creado (nuevo POA en el sistema)
- Documento Subido (por el cliente)
- Mensaje Recibido (del Cliente)

## 🐛 Troubleshooting

### No recibo emails

1. **Verifica la configuración en .env:**
   ```bash
   cat .env | grep GMAIL
   ```

   Debe mostrar:
   ```
   GMAIL_USER=jose890823@gmail.com
   GMAIL_APP_PASSWORD=tu_app_password_aqui
   ```

2. **Verifica los logs del servidor:**
   - Debes ver: `✅ EmailService configurado correctamente con Gmail SMTP`
   - Si ves: `⚠️ Gmail SMTP no configurado` significa que falta el App Password

3. **Revisa la carpeta de SPAM**

### Error de autenticación

Si ves errores como "Invalid credentials" o "Authentication failed":

1. **Verifica que el App Password esté correcto** (sin espacios extras)
2. **Genera un nuevo App Password** desde Gmail
3. **Asegúrate de que 2FA esté activo** en tu cuenta de Gmail

### "This setting is not available"

Esto significa que no tienes la verificación en 2 pasos activa. Sigue la Opción B.

## 📊 Comparación: Gmail SMTP vs Resend

| Característica | Gmail SMTP | Resend (Sandbox) |
|----------------|------------|------------------|
| **Envío a cualquier email** | ✅ Sí | ❌ Solo al creador de la cuenta |
| **Límite diario** | 500 emails/día | 100 emails/día |
| **Límite por segundo** | ~1 email/seg | 2 emails/seg |
| **Configuración** | App Password | API Key |
| **Verificación de dominio** | No requerido | Requerido para producción |
| **Recomendado para** | Desarrollo y testing | Producción (con dominio verificado) |

## 🔒 Seguridad

- **NUNCA** compartas tu App Password
- **NO** subas el archivo `.env` a Git (ya está en `.gitignore`)
- Para producción, considera usar un dominio verificado con Resend
- Gmail SMTP es perfecto para desarrollo, pero tiene límites para producción

## 📖 Documentación Adicional

- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [App Passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer Gmail Setup](https://nodemailer.com/usage/using-gmail/)

---

**¿Listo?** Dame tu App Password cuando lo tengas y lo configuramos juntos 🚀
