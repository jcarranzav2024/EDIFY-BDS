# Plan de arquitectura basica (Firebase gratis)

## Objetivo
Construir una web sencilla de contratistas con:
- Pagina principal publica para visitantes (sin login)
- Registro e inicio de sesion
- Perfil unico por usuario (cliente, contratista o admin)
- Publicacion de perfiles de contratistas
- Catalogo de trabajos anteriores por contratista
- Calificaciones de 1 a 5 estrellas con comentario opcional
- Visibilidad privada de calificaciones (solo contratista propietario, admins y clientes autenticados oficiales)
- Referencias de clientes por trabajo
- Suscripciones por planes (gratis, basico, intermedio, premium)
- Mensajeria cliente-contratista (solicitud y respuesta)
- Bot de ayuda con opciones de funciones clave de la plataforma
- Experiencia responsiva para moviles (flujos nuevos y existentes)
- Dashboard administrativo separado para gestion
- Persistencia real en la nube sin servidor propio

## Stack tecnico
- HTML (vistas)
- CSS (estilos)
- JavaScript vanilla (logica)
- Firebase Authentication (registro/login)
- Firebase Firestore (base de datos)
- URLs de imagen externas para catalogo (sin costo)
- Firebase Storage (opcional para fase futura)
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
  admin-dashboard.html

  /css
    styles.css
    auth.css

  /js
    app.js
    admin.js
    auth.js
    nav.js
    firebase-config.js
    contractors.js
    reviews.js
    validators.js

  /docs
    PLAN_ARQUITECTURA_BASICA.md
```

## Modulos funcionales (MVP)
1. Autenticacion
- Acceso publico al index para visitantes no autenticados
- Registro con correo y contraseña
- Inicio y cierre de sesion
- Control de estado del usuario autenticado
- Registro/login obligatorio solo para acciones privadas (ejemplo: contratar/solicitar servicio)
- Al cerrar sesion, redireccion al index publico (no al login)

2. Contratistas
- Listado de perfiles
- Filtros por especialidad y zona
- Vista de perfil publico

3. Calificaciones privadas (1 a 5 estrellas)
- Cliente autenticado oficial califica contratista con estrellas (1 a 5).
- Comentario opcional por calificacion.
- Validacion: una calificacion por cliente y contratista (actualizable por el cliente).
- Visibilidad de calificaciones: solo contratista propietario, admins y clientes autenticados oficiales.
- No se muestran calificaciones a visitantes anonimos.

4. Catalogo de trabajos anteriores
- Crear trabajo realizado con fecha de ejecucion
- Registrar varias imagenes por trabajo mediante URLs
- Adjuntar calificaciones del trabajo (1 a 5 + comentario opcional)
- Adjuntar referencias de clientes

Implementacion actual del catalogo:
- CRUD completo en perfil de contratista.
- Formulario en modal (abrir por boton "Nuevo trabajo").
- Cierre del modal solo con boton "X".
- Vista en tarjetas.
- Mini galeria por tarjeta con imagen principal + miniaturas.
- Clic en miniatura cambia la imagen principal de la tarjeta.
- Boton "Tamano real" abre visor y permite navegar todas las fotos del trabajo.
- Normalizacion de links de Google Images tipo /imgres a URL directa (imgurl).
- Compatibilidad movil: tarjetas fluidas, galeria tactil y modal ajustado a pantalla pequena.

5. Referencias
- Crear referencia por trabajo
- Ver referencias autorizadas por contratista

6. Mensajeria cliente-contratista
- Cliente autenticado envia mensaje de interes/solicitud al contratista.
- Contratista ve una lista de clientes interesados y responde cada mensaje.
- Estados del hilo: nuevo, leido, respondido, cerrado.
- Notificacion visual en perfil del contratista para mensajes pendientes.
- Acceso: solo participantes del hilo y admin.

7. Bot de ayuda (FAQ guiada)
- Bot en frontend con opciones rapidas (sin IA obligatoria para MVP).
- Flujos minimos: como publicar trabajos, como contratar contratistas, como dejar calificacion, como gestionar plan.
- Boton flotante visible en mobile y desktop.
- Escalado futuro: integrar IA o base de conocimiento dinamica.

8. Suscripciones y planes
- Planes: gratis, basico, intermedio, premium
- Registro de suscripcion activa por usuario
- Control de limites por plan (cantidad de trabajos en catalogo, imagenes, visibilidad)

9. Administracion (Dashboard Admin)
- Gestion de roles (cambiar rol de usuarios)
- Gestion de usuarios
- Vista de planes
- Vista de catalogo de trabajos
- Vista de calificaciones privadas (auditoria)
- Vista de mensajes y moderacion
- Ejecucion de seed demo

10. Persistencia
- Datos en Firestore (no localStorage como fuente principal)
- Lectura/escritura desde navegador con SDK de Firebase
- Indices y consultas optimizadas para mobile (paginacion por lotes y carga incremental)

11. Responsividad transversal (mobile-first)
- Layout mobile-first en todas las vistas (index, contratistas, perfil, reseñas, admin y autenticacion).
- Breakpoints recomendados: 360, 480, 768, 1024, 1280.
- Formularios con controles tactiles, botones min. 44px, tipografia legible y espaciado vertical.
- Tablas del admin con version compacta o tarjetas en pantallas pequenas.
- Validar navegacion tactil para modales, dropdowns, galerias y bot de ayuda.

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

Notas:
1. Los roles base son: cliente, contratista y admin.
2. El admin designado del sistema es el correo: admin@edifybds.com.

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
    "https://sitio-publico.com/proyecto/img1.jpg",
    "https://sitio-publico.com/proyecto/img2.jpg"
  ],
  "creadoEn": "serverTimestamp",
  "actualizadoEn": "serverTimestamp"
}
```

Nota: en el estado actual del MVP, `imagenes` almacena URLs publicas externas para evitar costo de Firebase Storage.

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

Regla funcional adicional:
- `estrellas` debe estar entre 1 y 5.
- `comentario` es opcional.
- Para evitar duplicados por contratista, usar opcionalmente una llave compuesta en el cliente (`contractorId_clientId`) o una consulta de verificacion antes de crear.

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

### Coleccion: service_requests
Documento con ID automatico
```json
{
  "clientId": "uid_cliente",
  "contractorId": "uid_contratista",
  "servicioSolicitado": "Electricidad",
  "detalle": "Instalar tomacorrientes en cocina",
  "estado": "pendiente",
  "createdAt": "serverTimestamp"
}
```

### Coleccion: contractor_messages
Documento con ID automatico
```json
{
  "contractorId": "uid_contratista",
  "clientId": "uid_cliente",
  "subject": "Solicitud de cotizacion",
  "message": "Necesito remodelar cocina y bano",
  "status": "nuevo",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Subcoleccion: contractor_messages/{messageId}/replies/{replyId}
Documento con ID automatico
```json
{
  "senderId": "uid_contratista_o_uid_cliente",
  "senderRole": "contratista",
  "message": "Claro, puedo visitarle el viernes.",
  "createdAt": "serverTimestamp"
}
```

### Coleccion: help_bot_faq
Documento con ID = slug de opcion
```json
{
  "title": "Como publicar trabajos",
  "category": "catalogo",
  "steps": [
    "Ingrese a su perfil de contratista",
    "Presione Nuevo trabajo",
    "Complete titulo, descripcion e imagenes por URL",
    "Guarde y valide que aparezca en su catalogo"
  ],
  "active": true,
  "updatedAt": "serverTimestamp"
}
```

### Coleccion: roles
Documento con ID = nombre del rol
```json
{
  "nombre": "supervisor",
  "creadoEn": "serverTimestamp"
}
```

## Reglas basicas de seguridad (Firestore)
1. Solo usuarios autenticados oficiales pueden escribir calificaciones.
2. Solo contratistas pueden editar su perfil profesional y sus trabajos.
3. Solo clientes autenticados pueden crear referencias y calificaciones.
4. Lectura de calificaciones restringida a contratista propietario, admin y clientes autenticados oficiales.
5. Solo admin puede gestionar roles, planes y usuarios.
6. Mensajes entre clientes y contratistas visibles solo para participantes y admin.
7. Bot FAQ de solo lectura publica; edicion solo admin.

Reglas exactas recomendadas para el estado actual del proyecto:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isDesignatedAdminEmail() {
      return isSignedIn() && request.auth.token.email == "admin@edifybds.com";
    }

    function userRole() {
      return isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data.rol
        : "guest";
    }

    function isAdmin() {
      return isSignedIn() && (isDesignatedAdminEmail() || userRole() == "admin");
    }

    function isContractor() {
      return userRole() == "contratista";
    }

    function isClientOrAdmin() {
      return userRole() == "cliente" || isAdmin();
    }

    match /users/{userId} {
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == userId);

      allow create: if isSignedIn() && request.auth.uid == userId && (
        request.resource.data.rol in ["cliente", "contratista"] || isDesignatedAdminEmail()
      );

      allow update: if isAdmin() || (
        isSignedIn() && request.auth.uid == userId && (
          request.resource.data.rol in ["cliente", "contratista"] || isDesignatedAdminEmail()
        )
      );

      allow delete: if isAdmin();
    }

    match /contractors/{contractorId} {
      allow read: if true;

      allow create, update, delete: if isAdmin() || (
        isSignedIn() && request.auth.uid == contractorId && isContractor()
      );
    }

    match /portfolio_jobs/{jobId} {
      allow read: if true;

      allow create: if isAdmin() || (
        isSignedIn() && isContractor() && request.resource.data.contractorId == request.auth.uid
      );

      allow update, delete: if isAdmin() || (
        isSignedIn() && isContractor() && resource.data.contractorId == request.auth.uid
      );
    }

    match /reviews/{reviewId} {
      allow read: if isAdmin() || (
        isSignedIn() && (
          userRole() == "cliente" ||
          request.auth.uid == resource.data.contractorId
        )
      );

      allow create: if isSignedIn() && (
        isAdmin() || (
          userRole() == "cliente" &&
          request.resource.data.clientId == request.auth.uid &&
          request.resource.data.estrellas >= 1 &&
          request.resource.data.estrellas <= 5
        )
      );

      allow update: if isAdmin() || (
        isSignedIn() && userRole() == "cliente" && resource.data.clientId == request.auth.uid &&
        request.resource.data.estrellas >= 1 && request.resource.data.estrellas <= 5
      );

      allow delete: if isAdmin();
    }

    match /client_references/{referenceId} {
      allow read: if resource.data.autorizadoPublicar == true || isAdmin();

      allow create: if isSignedIn() && (
        isAdmin() || userRole() == "cliente"
      );

      allow update, delete: if isAdmin();
    }

    match /plans/{planId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /subscriptions/{subscriptionId} {
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == resource.data.userId);

      allow create: if isAdmin() || (
        isSignedIn() && request.auth.uid == request.resource.data.userId && isContractor()
      );

      allow update, delete: if isAdmin();
    }

    match /service_requests/{requestId} {
      allow create: if isSignedIn() && isClientOrAdmin() && request.resource.data.clientId == request.auth.uid;

      allow read: if isAdmin() || (
        isSignedIn() && (
          request.auth.uid == resource.data.clientId ||
          request.auth.uid == resource.data.contractorId
        )
      );

      allow update: if isAdmin() || (
        isSignedIn() && request.auth.uid == resource.data.contractorId
      );

      allow delete: if isAdmin();
    }

    match /contractor_messages/{messageId} {
      allow create: if isSignedIn() && (
        isAdmin() || (userRole() == "cliente" && request.resource.data.clientId == request.auth.uid)
      );

      allow read: if isAdmin() || (
        isSignedIn() && (
          request.auth.uid == resource.data.clientId ||
          request.auth.uid == resource.data.contractorId
        )
      );

      allow update: if isAdmin() || (
        isSignedIn() && (
          request.auth.uid == resource.data.contractorId ||
          request.auth.uid == resource.data.clientId
        )
      );

      allow delete: if isAdmin();
    }

    match /contractor_messages/{messageId}/replies/{replyId} {
      allow create: if isAdmin() || (
        isSignedIn() && exists(/databases/$(database)/documents/contractor_messages/$(messageId)) && (
          request.auth.uid == get(/databases/$(database)/documents/contractor_messages/$(messageId)).data.clientId ||
          request.auth.uid == get(/databases/$(database)/documents/contractor_messages/$(messageId)).data.contractorId
        )
      );

      allow read: if isAdmin() || (
        isSignedIn() && exists(/databases/$(database)/documents/contractor_messages/$(messageId)) && (
          request.auth.uid == get(/databases/$(database)/documents/contractor_messages/$(messageId)).data.clientId ||
          request.auth.uid == get(/databases/$(database)/documents/contractor_messages/$(messageId)).data.contractorId
        )
      );

      allow update, delete: if isAdmin();
    }

    match /help_bot_faq/{faqId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /roles/{roleId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

## Flujo tecnico
0. Navegacion publica:
- Visitantes pueden entrar a `index.html` sin autenticacion.
- Visitantes pueden explorar informacion publica (home, catalogo/listados publicos).
- Al intentar contratar/solicitar servicio, la app solicita registro o login.
- Cuando un usuario cierra sesion, vuelve a `index.html` para continuar como visitante.

1. Registro:
- Crear usuario en Firebase Auth.
- Guardar documento en users/{uid} con rol cliente o contratista.

2. Perfil contratista:
- Si el rol es contratista, crear/editar contractors/{uid}.

3. Perfil de usuario:
- Todo usuario ve y edita su perfil general en perfil.html.
- El perfil profesional de contratista se habilita solo si el rol es contratista.

4. Catalogo de trabajos:
- Contratista crea trabajo en portfolio_jobs.
- Registra URLs de imagen en el modal del catalogo.
- La tarjeta muestra imagen principal y miniaturas.
- "Tamano real" abre visor con navegacion entre todas las imagenes del trabajo.
- Se validan limites segun plan activo.

5. Calificacion y referencia:
- Cliente autenticado oficial crea/actualiza calificacion en reviews (1 a 5 + comentario opcional).
- Cliente autenticado crea referencia en client_references.
- Recalcular ratingPromedio y totalResenas del contratista.
- La vista de calificaciones queda restringida (contratista propietario, admin y clientes logeados oficiales).

6. Suscripcion:
- Contratista selecciona plan (gratis, basico, intermedio, premium).
- Se registra pago en pasarela y luego se guarda subscriptions.
- La app aplica limites y beneficios del plan.

7. Mensajeria cliente-contratista:
- Cliente autenticado envia mensaje al contratista desde su perfil publico.
- Contratista visualiza lista de clientes interesados en su bandeja.
- Contratista responde y se registra el hilo en subcoleccion replies.

8. Bot de ayuda:
- Usuario abre boton flotante del bot.
- Selecciona opcion guiada (ej: como publicar trabajos).
- Bot muestra pasos y enlaces directos a secciones relevantes.

9. Administracion:
- Dashboard separado en admin-dashboard.html.
- Admin puede gestionar roles, usuarios, planes, catalogo, calificaciones, mensajes y seed demo.
- El acceso al dashboard aparece en el dropdown de usuario solo para rol admin.

10. Responsividad global:
- Todas las vistas y flujos del sistema deben ser mobile-first.
- Verificacion minima en telefonos de gama baja/media y tablets.
- Las funciones nuevas (calificaciones privadas, mensajeria y bot) deben funcionar con interaccion tactil.

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
4. Base responsive mobile-first en layouts clave

Semana 2
1. CRUD de perfil contratista
2. Crear y listar calificaciones privadas
3. Catalogo de trabajos con varias imagenes
4. Bandeja de mensajes cliente-contratista (MVP)

Semana 3
1. Referencias de clientes por trabajo
2. Planes de suscripcion y limites por plan
3. Reglas de seguridad basicas + despliegue en GitHub Pages
4. Bot de ayuda con FAQ guiada

Semana 4
1. Dashboard admin separado
2. Gestion de roles y usuarios
3. Moderacion de mensajes/calificaciones + seed demo desde interfaz admin
4. QA responsive en moviles reales y emuladores

## Limitaciones actuales (MVP)
- Sin chat en tiempo real.
- Pagos en linea en fase inicial (sin facturacion avanzada).
- El admin designado por email es una solucion practica para MVP (ideal migrar luego a custom claims con backend).
- Las imagenes del catalogo se manejan por URL externa (sin carga binaria directa desde la app).
- El bot de ayuda en MVP usa FAQ guiada (sin NLP avanzado).

## Escalado futuro
1. Agregar Cloud Functions para validaciones de negocio.
2. Agregar Storage para fotos de proyectos.
3. Integrar webhooks de pasarela para confirmar pagos automaticamente.
4. Agregar busqueda avanzada y paginacion.
5. Evolucionar mensajeria a chat en tiempo real con notificaciones push.
6. Evolucionar bot de ayuda a asistente inteligente con contexto de usuario.
