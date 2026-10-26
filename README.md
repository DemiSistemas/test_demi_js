# Test de filiación divina — Demigods ARG (Next.js)

Versión JavaScript/Next.js del test que estaba en Streamlit. Conserva `data.json`, las preguntas y puntuaciones, la lógica de candidatos y asignación de cabañas, y la conexión con Supabase.

## Requisitos
- Node.js 20 o superior
- El proyecto y la tabla `campistas` existentes en Supabase

## Configurar localmente
1. Descomprimí el ZIP.
2. En la carpeta del proyecto, copiá `.env.example` y llamá a la copia `.env.local`.
3. Completá en `.env.local` la URL de Supabase y la clave privada que usaba la app anterior:

   ```env
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=TU_CLAVE_PRIVADA
   ```

4. Abrí una terminal en esa carpeta y ejecutá:

   ```bash
   npm install
   npm run dev
   ```

5. Abrí http://localhost:3000

**No compartas ni subas `.env.local` a GitHub.** Está excluido por `.gitignore`. La clave `SUPABASE_SERVICE_ROLE_KEY` se utiliza únicamente en `app/api/campista/route.js`, del lado del servidor; no se incluye en el JavaScript del navegador.

## Supabase: comportamiento que conserva
- Tabla: `campistas`
- Columna de búsqueda: `cirse` (con S)
- Columnas actualizadas al confirmar: solamente `deidad` y `cabana`
- Un Circe está disponible si `deidad` y `cabana` son ambas `NULL`.
- La actualización vuelve a comprobar que ambas columnas sigan vacías para evitar una doble asignación.
- Si no existe el Circe, ya fue asignado o hay duplicados, se muestra un error.

La tabla debe tener los mismos nombres y tipos de columna que la versión anterior. Esta aplicación no crea ni modifica el esquema de Supabase.

## Publicar
Este proyecto está preparado para desplegarse en Vercel:
1. Subí los archivos del proyecto a un repositorio de GitHub, sin `.env.local`.
2. Importá ese repositorio en Vercel.
3. En **Project Settings → Environment Variables**, configurá `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
4. Desplegá el proyecto.

No pegues la clave privada en archivos JavaScript, en el chat ni en el repositorio.

## Estructura
- `app/page.js`: interfaz del test.
- `app/api/campista/route.js`: consulta y actualización segura de Supabase.
- `lib/supabaseAdmin.js`: cliente de Supabase del servidor.
- `data.json`: preguntas y puntuaciones originales.
