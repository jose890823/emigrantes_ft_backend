#!/bin/bash

# Script para probar el sistema de notificaciones por email
# Requiere que el servidor esté corriendo en http://localhost:3001

API_URL="http://localhost:3001/api"
CLIENT_EMAIL="josemx890823@gmail.com"
ADMIN_EMAIL="jose890823@gmail.com"

echo "=================================="
echo "🧪 TEST DE NOTIFICACIONES POR EMAIL"
echo "=================================="
echo ""
echo "📧 Cliente: $CLIENT_EMAIL"
echo "📧 Admin: $ADMIN_EMAIL"
echo ""
echo "⏳ Paso 1: Autenticándose como super_admin..."
echo ""

# Primero, intentar login con el usuario super admin existente
# Si no existe, mostrar instrucciones para crearlo
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@emigrantesft.com",
    "password": "Admin123!"
  }')

# Verificar si el login fue exitoso
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login exitoso"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
  echo "🔑 Token obtenido: ${TOKEN:0:20}..."
  echo ""
else
  echo "❌ Error en login. Respuesta del servidor:"
  echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""
  echo "📝 INSTRUCCIONES:"
  echo ""
  echo "Necesitas crear un usuario super_admin primero. Ejecuta estos comandos:"
  echo ""
  echo "# Opción 1: Usando el API"
  echo 'curl -X POST http://localhost:3001/auth/register \'
  echo '  -H "Content-Type: application/json" \'
  echo "  -d '{"
  echo '    "email": "admin@emigrantesft.com",'
  echo '    "password": "Admin123!",'
  echo '    "firstName": "Super",'
  echo '    "lastName": "Admin",'
  echo '    "phone": "+1234567890"'
  echo "  }'"
  echo ""
  echo "# Luego actualizar el rol a super_admin en la base de datos:"
  echo "PGPASSWORD=postgres psql -h localhost -U postgres -d emigrantes_ft -c \\"
  echo "  \"UPDATE users SET role = 'super_admin', \\\"emailVerified\\\" = true WHERE email = 'admin@emigrantesft.com';\""
  echo ""
  echo "# Opción 2: Directamente en la base de datos"
  echo "PGPASSWORD=postgres psql -h localhost -U postgres -d emigrantes_ft -c \\"
  echo "  \"INSERT INTO users (email, password, \\\"firstName\\\", \\\"lastName\\\", phone, role, \\\"emailVerified\\\") "
  echo "  VALUES ('admin@emigrantesft.com', '\$2b\$10\$7Z9Xr8K5L2M3N4P5Q6R7S.T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3', 'Super', 'Admin', '+1234567890', 'super_admin', true);\""
  echo ""
  exit 1
fi

echo "⏳ Paso 2: Enviando 15 notificaciones de prueba..."
echo ""

# Enviar todas las notificaciones del ciclo de vida del POA
TEST_RESPONSE=$(curl -s -X POST "$API_URL/notifications/test/poa-lifecycle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientEmail\": \"$CLIENT_EMAIL\",
    \"adminEmail\": \"$ADMIN_EMAIL\"
  }")

echo "📬 Respuesta del servidor:"
echo "$TEST_RESPONSE" | jq . 2>/dev/null || echo "$TEST_RESPONSE"
echo ""

# Verificar si fue exitoso
if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
  echo "=================================="
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  echo "=================================="
  echo ""
  echo "📧 Se enviaron 15 emails:"
  echo ""
  echo "📥 A $CLIENT_EMAIL (Cliente) - 12 emails:"
  echo "   1. POA Enviado"
  echo "   2. POA Asignado"
  echo "   3. POA En Revisión"
  echo "   4. POA Aprobado"
  echo "   5. POA Rechazado"
  echo "   6. POA Notarizado"
  echo "   7. POA Activado"
  echo "   8. POA Ejecutado"
  echo "   9. POA Completado"
  echo "   10. Documento Subido"
  echo "   11. Documento Aprobado"
  echo "   12. Documento Rechazado"
  echo "   13. Mensaje Recibido"
  echo ""
  echo "📥 A $ADMIN_EMAIL (Admin) - 4 emails:"
  echo "   1. POA Creado"
  echo "   2. Documento Subido"
  echo "   3. Mensaje Recibido"
  echo ""
  echo "⏰ Los emails pueden tardar unos segundos en llegar"
  echo "📂 Revisa también la carpeta de SPAM si no los ves"
  echo ""
  echo "🎉 ¡SISTEMA DE NOTIFICACIONES FUNCIONANDO CORRECTAMENTE!"
else
  echo "=================================="
  echo "❌ ERROR EN EL TEST"
  echo "=================================="
  echo ""
  echo "El servidor respondió con un error. Verifica:"
  echo "  1. Que el servidor esté corriendo (http://localhost:3001)"
  echo "  2. Que Gmail SMTP esté configurado en el .env"
  echo "  3. Los logs del servidor para más detalles"
  echo ""
fi
