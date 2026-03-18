# Plan de arquitectura basica (Firebase gratis)

## Objetivo
Construir una web sencilla de contratistas con:
- Registro e inicio de sesion
- Publicacion de perfiles de contratistas
- Catalogo de trabajos anteriores por contratista
- Reseñas y calificacion
- Referencias de clientes por trabajo
- Suscripciones por planes (gratis, basico, intermedio, premium)
- Persistencia real en la nube sin servidor propio

## Stack tecnico
- HTML (vistas)
- CSS (estilos)
- JavaScript vanilla (logica)
- Firebase Authentication (registro/login)
- Firebase Firestore (base de datos)
- Firebase Storage (imagenes del catalogo)
- Pasarela de pago (Stripe o Mercado Pago)
- Hosting estatico en GitHub Pages

## Por que Firebase para este caso
1. Tiene plan gratis suficiente para un MVP.
2. Evita montar backend propio al inicio.
3. Funciona bien con sitios estaticos (HTML/CSS/JS).
4. Permite autenticar usuarios y guardar reseñas reales.

## Estructura de carpetas
```text
EDIFY-BDS/
  index.html
  login.html
  registro.html
  contratistas.html
  perfil.html
  resenas.html

  /css
    styles.css
    auth.css

  /js
    app.js
    auth.js
    firebase-config.js
    contractors.js
    reviews.js
    validators.js

  /docs
    PLAN_ARQUITECTURA_BASICA.md
```

## Modulos funcionales (MVP)
1. Autenticacion
- Registro con correo y contraseña
- Inicio y cierre de sesion
- Control de estado del usuario autenticado

2. Contratistas
- Listado de perfiles
- Filtros por especialidad y zona
- Vista de perfil publico

3. Catalogo de trabajos anteriores
- Crear trabajo realizado con fecha de ejecucion
- Subir varias imagenes por trabajo
- Adjuntar reseñas del trabajo
- Adjuntar referencias de clientes

4. Reseñas
- Crear reseña (1 a 5 estrellas + comentario)
- Ver reseñas por contratista
- Calculo de promedio

5. Suscripciones y planes
- Planes: gratis, basico, intermedio, premium
- Registro de suscripcion activa por usuario
- Control de limites por plan (cantidad de trabajos en catalogo, imagenes, visibilidad)

6. Persistencia
- Datos en Firestore (no localStorage como fuente principal)
- Lectura/escritura desde navegador con SDK de Firebase

## Modelo de datos simplificado (Firestore)

### Coleccion: users
Documento con ID = uid de Auth
```json
{
  "nombre": "Ana Perez",
  "cedula": "205960047",
  "email": "ana@email.com",
  "rol": "cliente",
  "telefono": "89096500",
  "zona": "Alajuela",
  "creadoEn": "serverTimestamp",
  "actualizadoEn": "serverTimestamp"
}
```

### Coleccion: contractors
Documento con ID = uid del contratista
```json
{
  "nombreVisible": "Carlos Mendez",
  "especialidad": "Carpinteria",
  "correoElectronico": "carlos.mendez@gmail.com",
  "zona": "Alajuela",
  "disponibilidad": "horario",
  "descripcion": "Muebles y remodelaciones pequeñas",
  "experiencia": "Basico, intermedio, avanzado",
  "ratingPromedio": 4.6,
  "totalResenas": 12,
   "creadoEn": "serverTimestamp",
  "actualizadoEn": "serverTimestamp"
}
```

### Coleccion: portfolio_jobs
Documento con ID automatico
```json
{
  "contractorId": "uid_contratista",
  "titulo": "Remodelacion de cocina",
  "descripcion": "Cambio de muebles y enchape",
  "fechaTrabajo": "2025-11-08",
  "imagenes": [
    "https://firebasestorage.googleapis.com/.../img1.jpg",
    "https://firebasestorage.googleapis.com/.../img2.jpg"
  ],
  "creadoEn": "serverTimestamp",
  "actualizadoEn": "serverTimestamp"
}
```

### Coleccion: reviews
Documento con ID automatico
```json
{
  "jobId": "id_trabajo_portafolio",
  "contractorId": "uid_contratista",
  "clientId": "uid_cliente",
  "estrellas": 5,
  "comentario": "Trabajo puntual y limpio",
  "fecha": "serverTimestamp"
}
```

### Coleccion: client_references
Documento con ID automatico
```json
{
  "jobId": "id_trabajo_portafolio",
  "contractorId": "uid_contratista",
  "nombreCliente": "Maria Lopez",
  "telefono": "88887777",
  "comentario": "Excelente cumplimiento y calidad",
  "autorizadoPublicar": true,
  "fecha": "serverTimestamp"
}
```

### Coleccion: plans
Documento con ID = nombre del plan
```json
{
  "nombre": "intermedio",
  "precioMensual": 12.99,
  "moneda": "USD",
  "maxTrabajosCatalogo": 30,
  "maxImagenesPorTrabajo": 12,
  "destacadoEnBusquedas": true,
  "soportePrioritario": false,
  "activo": true
}
```

### Coleccion: subscriptions
Documento con ID automatico
```json
{
  "userId": "uid_contratista",
  "planId": "intermedio",
  "estado": "activa",
  "inicio": "serverTimestamp",
  "finRenovacion": "serverTimestamp",
  "pasarela": "stripe",
  "referenciaPago": "pi_3Nxxxx",
  "monto": 12.99,
  "moneda": "USD"
}
```

## Reglas basicas de seguridad (Firestore)
1. Solo usuarios autenticados pueden escribir reseñas.
2. Solo el dueño del perfil contratista puede editar su perfil y sus trabajos.
3. Solo clientes autenticados pueden crear referencias y reseñas.
4. Lectura publica de perfiles, catalogo, reseñas y referencias autorizadas.
5. Solo admin puede crear o modificar planes.

Ejemplo inicial de reglas:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && request.auth.token.admin == true;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /contractors/{contractorId} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == contractorId;
    }

    match /portfolio_jobs/{jobId} {
      allow read: if true;
      allow create: if isSignedIn() && request.resource.data.contractorId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.contractorId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.contractorId == request.auth.uid;
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update, delete: if false;
    }

    match /client_references/{referenceId} {
      allow read: if resource.data.autorizadoPublicar == true;
      allow create: if isSignedIn();
      allow update, delete: if false;
    }

    match /plans/{planId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /subscriptions/{subscriptionId} {
      allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
      allow create: if isSignedIn() && request.auth.uid == request.resource.data.userId;
      allow update, delete: if false;
    }
  }
}
```

## Flujo tecnico
1. Registro:
- Crear usuario en Firebase Auth.
- Guardar documento en users/{uid}.

2. Perfil contratista:
- Si el rol es contratista, crear/editar contractors/{uid}.

3. Catalogo de trabajos:
- Contratista crea trabajo en portfolio_jobs.
- Sube imagenes a Firebase Storage y guarda URLs en el trabajo.
- Se validan limites segun plan activo.

4. Reseña y referencia:
- Cliente autenticado crea documento en reviews.
- Cliente autenticado crea referencia en client_references.
- Recalcular ratingPromedio y totalResenas del contratista.

5. Suscripcion:
- Contratista selecciona plan (gratis, basico, intermedio, premium).
- Se registra pago en pasarela y luego se guarda subscriptions.
- La app aplica limites y beneficios del plan.

## Configuracion minima de Firebase en frontend
Archivo sugerido: firebase-config.js
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## Ejecucion local y publicacion
Local:
1. Levantar servidor local (Live Server o Python).
2. Probar registro/login y CRUD de reseñas.

Publicar en GitHub Pages:
1. Subir el proyecto a GitHub.
2. Activar GitHub Pages desde la rama principal.
3. Agregar el dominio de GitHub Pages en Firebase Authentication (Authorized domains).

## Alcance inicial recomendado (2 semanas)
Semana 1
1. Estructura de archivos HTML/CSS/JS
2. Integracion Firebase Auth
3. Registro/login funcional

Semana 2
1. CRUD de perfil contratista
2. Crear y listar reseñas
3. Catalogo de trabajos con varias imagenes

Semana 3
1. Referencias de clientes por trabajo
2. Planes de suscripcion y limites por plan
3. Reglas de seguridad basicas + despliegue en GitHub Pages

## Limitaciones actuales (MVP)
- Sin panel administrativo completo.
- Sin chat en tiempo real.
- Pagos en linea en fase inicial (sin facturacion avanzada).

## Escalado futuro
1. Agregar Cloud Functions para validaciones de negocio.
2. Agregar Storage para fotos de proyectos.
3. Integrar webhooks de pasarela para confirmar pagos automaticamente.
4. Agregar busqueda avanzada y paginacion.
