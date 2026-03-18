# EDIFY-BDS MVP

Proyecto base en HTML, CSS y JavaScript con Firebase para:
- Registro e inicio de sesion
- Perfil de contratista
- Listado de contratistas
- Publicacion y lectura de resenas
- Base para catalogo y planes de suscripcion

## Estructura principal
- index.html
- login.html
- registro.html
- contratistas.html
- perfil.html
- resenas.html
- css/
- js/
- Docs/

## Configuracion de Firebase
1. Crea un proyecto en Firebase.
2. Activa Authentication con Email/Password.
3. Crea Firestore Database en modo produccion.
4. Crea Storage.
5. Copia tu configuracion web y reemplaza valores en js/firebase-config.js.

## Reglas minimas Firestore
Usa como base las reglas del plan en Docs/PLAN_ARQUITECTURA_BASICA.md.

## Ejecutar en local
Opcion A:
1. Instala la extension Live Server.
2. Abre index.html con Live Server.

Opcion B:
```bash
python -m http.server 5500
```
Abre: http://localhost:5500

## Publicar en GitHub Pages
1. Sube el proyecto a GitHub.
2. En Settings > Pages, selecciona la rama principal y carpeta root.
3. En Firebase Authentication agrega tu dominio de GitHub Pages en Authorized domains.

## Siguiente fase sugerida
1. Implementar formularios completos de catalogo de trabajos con multiples imagenes.
2. Implementar referencias por trabajo.
3. Implementar selector de plan y bloqueo por limites de suscripcion.
4. Integrar pasarela de pago (Stripe o Mercado Pago) usando backend serverless.
