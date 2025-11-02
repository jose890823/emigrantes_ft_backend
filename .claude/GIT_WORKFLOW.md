# Git Workflow - Emigrantes FT Backend

## 📍 Directorio del Repositorio

**IMPORTANTE**: El repositorio Git está inicializado en:
```
/home/josek/DATOS/PROYECTOS/EMIGRANTES_HERMANO_KEIMER/emigrantes_ft/emigrantes_ft_admin
```

Este es el directorio raíz del proyecto. **SIEMPRE** trabaja desde aquí para operaciones de Git.

## 🔗 Repositorio Remoto

```bash
git@github.com:jose890823/emigrantes_ft_backend.git
```

## 📋 Workflow para Commits

### Antes de hacer cambios:

```bash
# Verificar que estás en el directorio correcto
pwd
# Debe mostrar: /home/josek/DATOS/PROYECTOS/EMIGRANTES_HERMANO_KEIMER/emigrantes_ft/emigrantes_ft_admin

# Ver estado actual
git status
```

### Para hacer commits:

```bash
# Agregar archivos modificados
git add .

# Crear commit con mensaje descriptivo
git commit -m "feat: descripción del cambio

Detalles adicionales...

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push a GitHub
git push origin main
```

## 🚨 Recordatorios Importantes

1. ✅ **NUNCA** hacer `git add` o `git commit` desde directorios padres
2. ✅ **SIEMPRE** verificar `pwd` antes de hacer commits
3. ✅ El archivo `.env` está en `.gitignore` - nunca se subirá
4. ✅ `node_modules`, `dist`, `coverage` también están ignorados
5. ✅ Usar mensajes de commit descriptivos siguiendo Conventional Commits

## 📦 Archivos Ignorados (en .gitignore)

- `.env` - Credenciales y configuración local
- `node_modules/` - Dependencias npm
- `dist/` - Build compilado
- `coverage/` - Reportes de cobertura de tests
- Archivos temporales y logs

## 🌿 Branches

- `main` - Rama principal (producción)
- `dev` - Rama de desarrollo
- `feature/*` - Ramas de nuevas características
- `fix/*` - Ramas de corrección de bugs

## 📝 Convención de Commits

- `feat:` - Nueva característica
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Cambios de formato (no afectan código)
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Mantenimiento (actualizar dependencias, etc.)

## 🔄 Sincronización

```bash
# Antes de comenzar a trabajar
git pull origin main

# Después de completar cambios
git push origin main
```
