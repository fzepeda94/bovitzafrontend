# BovItzá — Manual funcional y políticas del sistema

## 1. Propósito

BovItzá administra el inventario bovino, sus propietarios, fincas, potreros, genealogía, salud, pesajes, compras, ventas y seguridad. El principio central es la **trazabilidad**: los errores se corrigen mediante edición o baja lógica, pero los hechos históricos no se borran físicamente.

El sistema es multiempresa. Cada cuenta ganadera trabaja dentro de un tenant y cada usuario puede quedar limitado a determinadas entidades. Un usuario sin acceso a una entidad no debe consultar ni modificar sus animales.

## 2. Estado inicial de la base

La base operativa fue vaciada antes de esta entrega. Se conservaron únicamente:

- usuarios y sus credenciales cifradas;
- roles y asignaciones de roles;
- tenant y relación del usuario con el tenant;
- secuencia técnica necesaria para generar códigos.

Se eliminaron animales, entidades, fincas, potreros, catálogos, salud, pesajes, partos, ventas, compras y movimientos operativos. También se revocaron las sesiones anteriores, por lo que es necesario iniciar sesión nuevamente.

Antes de limpiar se creó un respaldo `.bak` en la carpeta de respaldo de SQL Server Express.

## 3. Códigos automáticos

- Entidad: correlativo de tres dígitos, por ejemplo `001`.
- Finca: correlativo de tres dígitos, por ejemplo `009`.
- Potrero: código de finca más correlativo de tres dígitos. Los potreros de la finca `009` son `009001`, `009002`, etcétera.
- Animal: código permanente de seis dígitos, por ejemplo `000001`.

El código del animal no cambia por venta, transferencia, movimiento, muerte o baja.

## 4. Datos maestros

Los datos maestros alimentan las listas de selección del resto del sistema. No se deben agregar opciones fijas directamente en los formularios.

### 4.1 Entidades

Una entidad puede ser una persona individual, empresa, asociación, cooperativa u otra naturaleza configurada por el usuario. Por claridad, el campo se llama **Tipo de entidad**, no “Tipo de actividad”.

Una entidad puede actuar como propietaria de ganado, propietaria de finca, compradora, vendedora o entidad de procedencia.

Reglas:

- el código se asigna automáticamente;
- el tipo de entidad se selecciona del catálogo;
- país, departamento y municipio se seleccionan en ese orden;
- un departamento sólo pertenece a un país;
- un municipio sólo pertenece a un departamento;
- la baja es lógica;
- no se permite desactivar una entidad mientras tenga animales activos o fincas activas relacionadas.

### 4.2 Tipos de entidad

Catálogo administrable. Ejemplos habituales: Persona individual, Empresa y Asociación. El usuario puede crear, consultar, editar, desactivar y reactivar valores.

### 4.3 Países, departamentos y municipios

Son tres catálogos relacionados:

`País → Departamento → Municipio`

La selección en entidades y fincas es dependiente: primero país, luego departamento y por último municipio. Esto evita municipios asignados al departamento o país equivocado.

### 4.4 Fincas

Reglas:

- código automático de tres dígitos;
- entidad propietaria opcional;
- ubicación mediante catálogos de país, departamento y municipio;
- **Área total (cantidad)** es un decimal;
- la unidad se selecciona del catálogo de unidades de medida;
- la baja es lógica;
- una finca no se puede desactivar mientras tenga potreros activos.

### 4.5 Potreros

Cada potrero pertenece obligatoriamente a una finca. Puede repetirse el nombre “Potrero 1” en fincas distintas porque la identificación completa incluye finca y código.

Ejemplo:

- Finca `009`, Potrero 1: `009001`.
- Finca `010`, Potrero 1: `010001`.

No se permite desactivar un potrero mientras todavía tenga animales ubicados en él.

### 4.6 Unidades de medida

Catálogo para hectáreas, manzanas, caballerías, metros, unidades, libras, kilogramos y otras unidades necesarias. El nombre “Orden” fue retirado de la interfaz porque no agregaba una regla de negocio comprensible; los valores se muestran alfabéticamente.

### 4.7 Razas y colores

Catálogos independientes y administrables. Se usan al registrar o editar animales. No contienen datos precargados después de la limpieza.

### 4.8 Tipos de parto

Catálogo administrable para valores como normal, gemelar, distócico o cesárea. El tipo describe el evento; la cantidad y el sexo de las crías se registran por separado.

## 5. Animales bovinos

### 5.1 Inventario activo

El inventario activo incluye únicamente animales vivos, activos y marcados como parte del inventario. Los animales vendidos, muertos o dados de baja conservan su expediente, pero ya no cuentan como existencia activa.

### 5.2 Registro individual

Se utiliza para altas individuales, correcciones históricas o animales que no provienen de una compra por lote. En una compra normal se recomienda utilizar **Finanzas → Compras de ganado**, porque registra al mismo tiempo el lote, el costo y todos los animales.

### 5.3 Expediente individual

Concentra identificación, propiedad, procedencia, genealogía, salud, pesajes, ubicación, línea de tiempo y auditoría. Los datos desconocidos deben permanecer vacíos; el sistema no debe inventar valores.

### 5.4 Partos y crías

Al registrar un parto:

1. se valida que la madre sea hembra activa;
2. el total de crías debe coincidir con vivas más muertas;
3. cada cría viva recibe un animal y código permanente propios;
4. la fecha de nacimiento de la cría es la fecha del parto;
5. el propietario inicial de la cría es el propietario de la madre al momento del parto;
6. se registra la relación madre–cría y parto–cría;
7. la cría entra inmediatamente al inventario activo;
8. una hembra queda normalmente con destino “Retener”;
9. un macho queda normalmente marcado “Venta”, pero sigue activo hasta registrar la venta real.

Los nacidos muertos forman parte de las estadísticas del parto, pero no crean un animal activo.

### 5.5 Ejemplo de 10 vacas

Si se compran 10 vacas, el inventario activo es 10. Si las 10 tienen una cría viva, el inventario pasa a 20: 10 madres y 10 crías.

Si cinco crías son hembras y cinco machos:

- las cinco hembras pueden quedar como reemplazo o crecimiento del hato;
- los cinco machos se marcan como destinados a venta;
- mientras no se vendan, el inventario continúa siendo 20;
- al vender los cinco machos, el inventario activo baja a 15;
- los cinco machos vendidos conservan expediente, genealogía, pesajes, ubicación y resultado financiero.

No es correcto descontar al macho sólo por haber nacido o por estar destinado a venta. La salida ocurre en la fecha de venta, muerte o baja.

### 5.6 Muerte, merma y otras bajas

La muerte se registra desde el expediente como una baja de tipo Muerte. También se admiten pérdida, robo, sacrificio, descarte y otras causas. La baja:

- cambia el estado de vida;
- cierra la ubicación vigente;
- conserva todos los historiales;
- registra causa, diagnóstico, disposición y observaciones.

Una venta no se registra como baja; usa el módulo de Ventas de ganado.

## 6. Mapa de potreros

Los potreros se muestran agrupados por finca. Cada columna presenta código y nombre del potrero, por lo que dos potreros llamados “Potrero 1” no se confunden.

Al arrastrar un animal:

- se solicita fecha, motivo y observaciones;
- la ubicación anterior recibe fecha final;
- se crea una nueva ubicación vigente;
- el historial anterior no se elimina;
- el expediente permite consultar todas las ubicaciones anteriores.

## 7. Salud y pesajes

La pantalla permite consultar el historial por animal, crear, editar y desactivar lógicamente registros.

### 7.1 Principio activo

Es la sustancia que produce el efecto del medicamento, por ejemplo ivermectina o cipermetrina. Si el usuario desconoce el compuesto puede escribir el nombre comercial del producto, pero BovItzá no recomienda medicamentos ni dosis; esa decisión corresponde al veterinario o responsable sanitario.

### 7.2 Tratamientos

Se registra fecha, tipo, producto o principio activo, dosis, unidad, vía, próxima aplicación y observaciones. Los campos obligatorios se identifican con `*`.

### 7.3 Pesajes

Se registra fecha, peso, unidad, método y observaciones. El sistema normaliza internamente el equivalente en libras para análisis, sin sustituir el valor original capturado.

Una corrección actualiza el registro y deja auditoría. La eliminación es lógica.

## 8. Finanzas

### 8.1 Compras de ganado

La compra por lote es la entrada recomendada para varios animales. En una sola transacción:

- crea el lote de compra;
- crea cada animal con código permanente;
- distribuye precio y gastos entre los animales;
- crea el historial de propiedad con motivo Compra;
- crea el movimiento financiero de gasto.

Si una validación falla, no queda una compra parcial.

### 8.2 Ventas de ganado

La venta:

- exige que los animales estén activos;
- sólo agrupa animales del mismo propietario vendedor;
- registra comprador, modalidad, documento e ingreso;
- cambia cada animal a Vendido;
- cierra ubicación y propiedad vigentes;
- crea el detalle económico por animal;
- registra el movimiento financiero de ingreso;
- conserva el expediente histórico.

### 8.3 Lotes y créditos

Los lotes permiten relacionar animales comprados y distribuir costos. Los créditos documentan financiamiento; no cambian el inventario por sí solos.

## 9. Seguridad

El menú Seguridad contiene:

- Usuarios;
- Roles;
- Permisos;
- Roles y permisos;
- Usuarios y roles.

### 9.1 Usuarios

Permite crear, consultar, editar, desactivar y reactivar. Un usuario puede tener varios roles y varias entidades asignadas. Desactivar un usuario revoca sus sesiones y accesos, pero conserva historial.

### 9.2 Roles

Permite crear, consultar, editar, desactivar y reactivar roles. Los roles inactivos dejan de incluirse en tokens nuevos.

### 9.3 Permisos

Permiten autorizar acciones concretas. Códigos utilizados por las políticas principales:

- `ANIMALES.EDITAR`;
- `SALUD.EDITAR`;
- `FINANZAS.EDITAR`;
- `SEGURIDAD.ADMINISTRAR`;
- `PLATAFORMA.ADMINISTRAR`.

Los roles tradicionales continúan funcionando para no bloquear al administrador inicial. Los permisos asignados a roles se agregan al token en el siguiente inicio de sesión o renovación.

### 9.4 Acceso por entidad

Un usuario normal sólo puede consultar el ganado de las entidades asignadas. El administrador puede asignar varias entidades al mismo usuario. El administrador general conserva acceso transversal dentro del tenant.

## 10. Baja lógica y auditoría

Entidades, fincas, potreros, catálogos, usuarios, roles, permisos, animales, salud, pesajes y movimientos ganaderos no se eliminan físicamente desde la aplicación.

La baja lógica evita que el registro aparezca como activo, pero mantiene:

- identificador y código;
- fecha y usuario de creación/modificación;
- relaciones históricas;
- auditoría antes/después.

## 11. Componentes React

Las páginas principales usan nombres de archivo en español para facilitar su identificación:

- `InicioSesionPagina.tsx`;
- `InicioPagina.tsx`;
- `InventarioBovinoPagina.tsx`;
- `RegistroAnimalPagina.tsx`;
- `ExpedienteAnimalPagina.tsx`;
- `EntidadesPagina.tsx`;
- `FincasPagina.tsx`;
- `PotrerosPagina.tsx`;
- `CatalogosMaestrosPagina.tsx`;
- `MapaPotrerosPagina.tsx`;
- `SaludPesajesPagina.tsx`;
- `ComprasGanadoPagina.tsx`;
- `VentasGanadoPagina.tsx`;
- `UsuariosPagina.tsx`;
- `SeguridadPagina.tsx`.

## 12. Orden recomendado de configuración

Después de una base vacía:

1. iniciar sesión como administrador;
2. crear tipos de entidad;
3. crear países, departamentos y municipios;
4. crear unidades de medida;
5. crear razas, colores y tipos de parto;
6. crear entidades;
7. crear fincas y potreros;
8. configurar permisos y roles adicionales;
9. crear usuarios y asignar entidades;
10. registrar compras o animales individuales;
11. operar ubicación, salud, pesajes, partos, ventas y bajas.

## 13. Rutas del proyecto

- Frontend React: `C:\BovItzá`.
- Backend .NET: `C:\Users\fzepe\source\repos\BovItzá`.
- Solución de Visual Studio: `C:\Users\fzepe\source\repos\BovItzá\BovItzá.sln`.

El frontend no debe contener backend ni scripts de base; el backend no debe contener el proyecto React.
