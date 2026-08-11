# Contexto técnico y funcional de BovItzá

Documento de traspaso para continuar el desarrollo con Claude Code. Describe el estado real observado el 4 de agosto de 2026.

## 1. Identidad y ubicaciones

- Producto visible: **BovItzá**.
- Frontend React: `C:\BovItzá`.
- Backend .NET: `C:\Users\fzepe\source\repos\BovItzá`.
- Solución: `C:\Users\fzepe\source\repos\BovItzá\BovItzá.sln`.
- Proyecto ejecutable: `BovItzá.Api\BovItzá.Api.csproj`.
- Base local: SQL Server Express, base `BovItzá`.
- API local: HTTPS `https://localhost:7055` y HTTP `http://localhost:5076`.
- Frontend local: `http://localhost:5173`.
- Swagger en desarrollo: `https://localhost:7055/swagger`.
- Health check: `/health`.

No hay proyectos Domain, Application o Infrastructure separados. El backend es una sola ASP.NET Core Web API.

## 2. Cómo ejecutar y verificar

### Backend

```powershell
cd C:\Users\fzepe\source\repos\BovItzá
dotnet build .\BovItzá.sln --configuration Release
dotnet run --project .\BovItzá.Api\BovItzá.Api.csproj --launch-profile https
```

### Frontend

```powershell
cd C:\BovItzá
npm install
npm run dev
```

Verificación vigente:

```powershell
npm run lint
npm test
npm run build
```

Estado comprobado: backend compila con 0 errores y 0 advertencias; frontend compila y tiene 3 pruebas aprobadas en `src/lib/domain.test.ts`.

## 3. Configuración y secretos

- El backend usa `ConnectionStrings:DefaultConnection`.
- La configuración base apunta a `.\SQLEXPRESS`, base `BovItzá`, autenticación integrada y `TrustServerCertificate=True`.
- El proyecto usa User Secrets con ID `BovItza-Development`.
- Secretos requeridos: `Jwt:SigningKey`, `BootstrapAdmin:Email` y `BootstrapAdmin:Password`.
- No guardar contraseñas ni la llave JWT en Git ni en este documento.
- La cuenta administrativa local actualmente usa el correo `admin@agrocorez.local`; la contraseña está sólo en User Secrets.
- CORS permite `http://localhost:5173`.
- Vite redirige `/api` hacia `https://localhost:7055` con certificado local no verificado.
- `VITE_API_URL` puede sobrescribir la base; si no existe, el frontend utiliza `/api/v1`.

## 4. Backend

### Tecnologías

- .NET 8, nullable habilitado y advertencias tratadas como errores.
- ASP.NET Core Web API con controladores y versión `/api/v1`.
- Entity Framework Core 8 y SQL Server.
- ASP.NET Core Identity con claves `Guid`.
- JWT Bearer y refresh tokens rotativos.
- FluentValidation.
- Swagger/OpenAPI.
- Serilog.
- Middleware de errores RFC Problem Details e idempotencia.

### Arranque

`Program.cs` registra contexto de tenant/usuario, EF, Identity, servicios, validadores, JWT, políticas, CORS, Swagger y health checks. Al iniciar fuera de `Testing` ejecuta `Database.MigrateAsync()` y después `InitialDataSeeder.SeedAsync()`.

### Autenticación

- `POST /api/v1/auth/login`: recibe correo, contraseña y tenant opcional.
- `POST /api/v1/auth/refresh`: rota el refresh token; el anterior queda revocado y enlazado al reemplazo.
- `POST /api/v1/auth/revoke`: revoca la sesión; requiere JWT.
- Access token: 15 minutos por defecto.
- Refresh token: 30 días por defecto, aleatorio de 64 bytes y almacenado como SHA-256, nunca en texto plano.
- Bloqueo Identity: 5 intentos fallidos y 15 minutos.
- Contraseña: mínimo 12 caracteres, mayúscula, minúscula, dígito y carácter no alfanumérico.
- Claims JWT: `sub`, correo, nombre, `active_tenant`, uno o más claims `tenant` y roles.
- El header `X-Tenant-Id` permite cambiar al tenant únicamente si está incluido en los claims del usuario.

### Roles y políticas

Roles creados por el seeder:

- `SuperAdministradorBovItzá`
- `Administrador`
- `EncargadoDeFinca`
- `Veterinario`
- `Finanzas`
- `Consulta`

Políticas:

- `AnimalesEscritura`: Administrador o EncargadoDeFinca.
- `SaludEscritura`: Administrador o Veterinario.
- `FinanzasEscritura`: Administrador o Finanzas.
- `Administracion`: Administrador.
- `Plataforma`: SuperAdministradorBovItzá.

El administrador inicial recibe `Administrador` y `SuperAdministradorBovItzá`, y acceso al tenant inicial.

### Multitenencia y seguridad por entidad

- El tenant inicial tiene ID fijo `96cd2f3d-c59d-44ef-9282-2fa29d38a9e1` y valores iniciales: nombre `Mi ganadería`, moneda `GTQ`, cultura `es-GT`, peso `libra` y zona `America/Guatemala`.
- Las entidades privadas heredan de `TenantEntity`: `Id`, `TenantId`, `Activo`, auditoría temporal y `RowVersion`.
- EF aplica filtro global: tenant activo obligatorio y `Activo = true`.
- Administradores ven todos los animales del tenant.
- Usuarios no administradores sólo ven animales cuyo `PropietarioActualId` esté asignado mediante `UserEntidades`.
- El alta y modificación de animales valida que el usuario tenga asignada la entidad propietaria, salvo administradores.
- El origen de llamadas puede enviarse en `X-BovItza-Origin`; por defecto es `web`.

### Códigos automáticos

- Entidad: secuencia por tenant, código de 3 dígitos (`001`, `002`, etc.).
- Finca: secuencia por tenant, código de 3 dígitos.
- Potrero: código de finca + correlativo de 3 dígitos. Ejemplo finca `009`: `009001`, `009002`.
- Animal: secuencia por tenant formateada por `AnimalCode.Format`.
- La generación usa transacciones serializables para evitar duplicados concurrentes.

### Animales

Rutas principales:

- `GET /animales`: listado paginado, búsqueda por código, arete o texto de origen; orden por código, arete o categoría.
- `GET /animales/{id}`.
- `POST /animales`: alta confirmada.
- `PUT /animales/{id}`: edición.
- `POST /animales/referencias`: crea padre/madre u otro animal de referencia fuera de inventario.
- `POST /animales/{id}/convertir-referencia`: incorpora una referencia al inventario y le asigna código formal.
- `POST /animales/{id}/propiedad`: cambia entidad propietaria y cierra/abre periodos del historial.
- `POST /animales/{id}/movimientos`: mueve finca/potrero, cerrando la ubicación vigente.
- `PUT /animales/borradores/{clientDraftId}`: upsert de borrador JSON.

Datos principales del animal:

- Código automático, arete normalizado y único por tenant.
- Propietario actual, entidad de origen y lote de compra.
- Sexo, categoría, raza, color.
- Fecha exacta o estimada, precisión y fuente.
- Madre, padre y observaciones genealógicas.
- Estado de vida, reproductivo y sanitario.
- Indicadores de referencia, inventario y disponibilidad para venta.
- Costo original y administrativo asignados como `decimal`.
- Historial separado de propiedad, ubicación y estados.

Reglas relevantes:

- Las entidades, padres, finca y potrero deben pertenecer al tenant activo.
- El potrero debe pertenecer a la finca elegida.
- El arete no puede repetirse.
- Si se registra desde un lote, copia costos promedio, incrementa cantidad registrada y marca el lote completo al alcanzar la cantidad esperada; impide excederla.
- La creación registra historial inicial de propiedad y, si procede, ubicación.
- No se importan automáticamente los 62 animales históricos.

### Datos maestros

- `GET/POST/PUT/DELETE /entidades` (DELETE es baja lógica).
- `GET/POST/PUT /fincas`.
- `GET/POST/PUT /potreros`, con filtro opcional por finca.
- Escritura restringida a `Administracion`.
- En base de datos, las entidades se representan con el modelo histórico `Propietario`, pero la API y UI usan el término **Entidad**.
- Entidad admite persona individual o jurídica, nombres/razón social, nombre comercial, NIT, DPI, contacto, dirección y observaciones.
- Finca puede asociarse a una entidad propietaria y registra ubicación, área y coordenadas.
- Potrero pertenece obligatoriamente a una finca y registra área, capacidad, pasto, agua, estado y observaciones.

### Salud, pesajes y operaciones

- Pesajes: listado opcional por animal y alta; escritura con `AnimalesEscritura`.
- Registros de salud/tratamientos: listado opcional por animal y alta; escritura con `SaludEscritura`.
- Movimientos financieros: lectura para Administrador o Finanzas y alta con `FinanzasEscritura`.
- El modelo ya contempla reproducción (`ServiciosReproductivos`, `DiagnosticosPrenez`, `Partos`, `Destetes`), bajas, productos veterinarios e inventario, aunque no todos tienen flujo completo en la interfaz actual.

### Finanzas

El modelo contempla:

- Lotes de compra, cantidad esperada/registrada, precio y costos administrativos.
- Créditos y cuotas.
- Ventas y detalle por animal.
- Movimientos financieros, gastos recurrentes y asignación de costos.
- Importes con `decimal`, nunca `float`/`double`.
- `GET /lotes`, `GET /lotes/{id}`, `GET /creditos` y `GET /creditos/{id}/cuotas` están expuestos.
- El frontend de lotes/créditos es principalmente de consulta; el flujo completo de compra, tracking financiero y formularios de crédito todavía requiere ampliación.

### Administración, configuración y soporte

- `/usuarios`: listar, crear y actualizar usuarios; asigna un rol y varias entidades.
- `/configuracion/tenant`: leer y actualizar nombre, moneda, cultura, unidad de peso y zona horaria.
- `/dashboard`: resumen agregado del tenant.
- `/reportes/inventario.csv`: exportación de inventario en CSV UTF-8.
- `/sincronizacion`: consulta operaciones; administrador puede reintentar una operación.
- `X-Idempotency-Key` evita reprocesar operaciones offline repetidas.
- Auditoría y operaciones de sincronización tienen tablas propias.

## 5. Frontend

### Tecnologías

- React 19 + TypeScript estricto.
- Vite 7 y Tailwind CSS.
- React Router.
- TanStack React Query para datos remotos y caché.
- React Hook Form + Zod para formularios/validación.
- Dexie/IndexedDB para offline.
- dnd-kit para mapa y movimientos por arrastre.
- Recharts para indicadores.
- jsPDF y AutoTable para reportes.
- PWA mediante `vite-plugin-pwa`.
- Lucide React para iconografía.

### Autenticación del cliente

- La sesión completa se guarda en `localStorage` bajo `bovitza.auth`.
- Cada petición agrega `Authorization: Bearer ...` y `X-Tenant-Id`.
- Ante `401`, intenta renovar una sola vez mediante `/auth/refresh` y repite la solicitud.
- Si la renovación falla, elimina la sesión.
- `GuestRoute` protege `/login`; `ProtectedRoute` protege el resto.
- La UI muestra administración únicamente cuando el rol incluye `Administrador`.

### Rutas y pantallas

- `/login`: acceso.
- `/`: dashboard.
- `/datos-maestros/entidades`: CRUD de entidades.
- `/datos-maestros/fincas`: CRUD de fincas.
- `/datos-maestros/potreros`: CRUD de potreros.
- `/animales`: inventario y búsqueda.
- `/animales/nuevo`: asistente de registro en siete pasos.
- `/animales/:id`: detalle y acceso a edición.
- `/mapa-potreros`: mapa de potreros y movimiento drag-and-drop.
- `/salud`: pesajes y tratamientos.
- `/lotes`: lotes y créditos.
- `/usuarios`: usuarios, roles y entidades asignadas.
- `/sincronizacion`: cola/estado de sincronización.
- `/configuracion`: parámetros del tenant.
- Ruta comodín: página no encontrada.

Jerarquía visible del menú:

1. DATOS MAESTROS: Entidades, Fincas, Potreros.
2. ANIMALES BOVINOS: Animales, Registrar animal.
3. MAPA DE POTREROS.
4. SALUD Y PESAJES.
5. FINANZAS: Lotes y créditos.
6. Para administradores: Usuarios, Sincronización y Configuración.

### Asistente de animales

Carga desde API entidades, lotes, fincas, potreros y animales de referencia. Permite alta y edición. Los datos abarcan identificación/origen, características, nacimiento, genealogía, ubicación, estado y revisión. Los códigos son sólo lectura porque se asignan en backend. Los selectores no deben contener personas o entidades quemadas: deben provenir de Datos Maestros.

### Offline y sincronización

- Base IndexedDB: `bovitza-offline`.
- Stores: `animals`, `drafts`, `queue`.
- Tipos en cola: borrador, movimiento, pesaje, tratamiento, parto y nota.
- Estados: Pendiente, Sincronizando, Sincronizada, Conflicto y Error.
- `runSync()` procesa Pendiente/Error al recuperar conexión.
- Envía `X-Idempotency-Key` con el ID local y `X-BovItza-Origin: sincronizacion`.
- HTTP 409 queda como Conflicto; otros fallos como Error.

## 6. Base de datos

### Motor y migraciones aplicadas

- SQL Server Express: `.\SQLEXPRESS`.
- Base: `BovItzá`.
- Migraciones registradas:
  - `20260803183617_InitialCreate`
  - `20260803202038_EsquemaIdentidadEnEspanol`
  - `20260803210750_SimplificarDatosMaestros`

### Tablas principales existentes

- Seguridad: `Usuarios`, `Roles`, `RolesUsuario`, `AsercionesRol`, `AsercionesUsuario`, `IniciosSesionUsuario`, `TokensUsuario`, `RefreshTokens`, `UserTenants`.
- Tenancy: `Tenants`, `TenantSequences`.
- Maestros: `Entidades`, `Fincas`, `Potreros`, `Catalogos`.
- Ganado: `Animales`, `AnimalDrafts`, `AnimalPropiedadHistorial`, `AnimalUbicacionHistorial`, `AnimalEstadoHistorial`.
- Reproducción/salud: `ServiciosReproductivos`, `DiagnosticosPrenez`, `Partos`, `Destetes`, `RegistrosSalud`, `RegistroSaludAnimales`, `ProductosVeterinarios`, `Pesajes`, `Bajas`.
- Finanzas: `LotesCompra`, `Creditos`, `CuotasCredito`, `Ventas`, `VentaDetalles`, `MovimientosFinancieros`, `GastosRecurrentes`, `AsignacionesCosto`.
- Operación: `Auditoria`, `OperacionesSincronizacion`.

Índices únicos relevantes: códigos por tenant, arete por tenant, detalle de venta por animal, token hash, operación cliente, borrador cliente y secuencia por tenant.

La baja de registros ganaderos/financieros debe ser lógica usando `Activo`; no se deben eliminar físicamente.

## 7. Incidencias y deuda técnica conocidas

1. Existe el archivo de migración `20260803230000_UsuariosEntidades.cs`, pero no aparece en `__EFMigrationsHistory` y la tabla `UserEntidades` no fue encontrada en el inventario de la base. Debe corregirse/generarse correctamente y aplicarse antes de depender del filtrado de animales por entidades para usuarios no administradores.
2. El frontend de finanzas todavía no implementa el flujo completo solicitado para entrada/compra de ganado, control opcional por lotes y tracking financiero.
3. Varias entidades del dominio (reproducción, ventas, bajas, inventario veterinario y asignación de costos) existen en modelo/base, pero no cuentan con CRUD/pantallas completos.
4. Sólo hay una prueba frontend pequeña; faltan pruebas de integración del backend, autenticación, multitenencia, permisos y reglas de códigos.
5. `dist`, `node_modules`, `bin`, `obj` y `.vs` son artefactos locales y no deben considerarse código fuente.
6. Hay respaldos de reorganizaciones anteriores fuera de las dos rutas canónicas. No usarlos como fuente ni borrarlos sin revisión explícita.
7. El correo administrativo conserva el dominio histórico `agrocorez.local`; es un identificador local, no la marca visible.

## 8. Prioridades recomendadas para continuar

1. Reparar y aplicar la migración `UserEntidades`; probar aislamiento por tenant y por entidad.
2. Añadir pruebas backend de login/refresh/revoke, roles, códigos concurrentes, altas y movimientos.
3. Completar Finanzas: compra, lote opcional, crédito, cuotas, costos, flujo de caja y rentabilidad.
4. Completar salud/reproducción/ventas/bajas e inventario veterinario.
5. Revisar todos los formularios: `*` en obligatorios y mensajes en español.
6. Mantener códigos y opciones configurables en API/base; no volver a quemar propietarios, procedencias, fincas o potreros en React.
7. Preservar siempre `TenantId`, filtros globales, `decimal`, baja lógica e idempotencia offline.

## 9. Archivos clave

Backend:

- `BovItzá.Api/Program.cs`
- `BovItzá.Api/Data/BovItzáDbContext.cs`
- `BovItzá.Api/Data/InitialDataSeeder.cs`
- `BovItzá.Api/Security/AuthService.cs`
- `BovItzá.Api/Services/AnimalService.cs`
- `BovItzá.Api/Controllers/*.cs`
- `BovItzá.Api/Models/**/*.cs`
- `BovItzá.Api/Data/Migrations/*.cs`

Frontend:

- `src/main.tsx`
- `src/types.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/api.ts`
- `src/lib/offline.ts`
- `src/lib/sync.ts`
- `src/components/AppLayout.tsx`
- `src/pages/*.tsx`
- `vite.config.ts`
- `package.json`

## 10. Instrucción breve para Claude Code

Trabajar únicamente sobre las rutas canónicas indicadas. Antes de modificar, compilar ambos proyectos y consultar el esquema/migraciones reales. No reconstruir desde respaldos. No introducir datos maestros quemados, no omitir filtros de tenant o entidad, no guardar secretos, no usar borrado físico y no separar el backend en bibliotecas adicionales sin autorización del propietario.
