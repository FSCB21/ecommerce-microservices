# Diseño de bases de datos

## 1. Introducción

La arquitectura del proyecto E-commerce Microservices implementa el principio de independencia de datos, mediante el cual cada microservicio administra su propia base de datos PostgreSQL. Esta separación permite que cada componente gestione su información de manera autónoma, evitando dependencias directas entre las estructuras internas de los diferentes servicios.

Se implementaron cuatro bases de datos independientes: `users_db`, `products_db`, `orders_db` y `notifications_db`. Cada una almacena la información correspondiente a las responsabilidades del microservicio al que pertenece.

## 2. Base de datos de usuarios (users_db)

Esta base de datos pertenece al microservicio User Service y almacena la información relacionada con el registro y la administración de los usuarios de la plataforma.

### Tabla users

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único del usuario. |
| name | VARCHAR(100) | Nombre del usuario. |
| email | VARCHAR(150) | Correo electrónico único. |
| password_hash | VARCHAR(255) | Contraseña almacenada mediante un hash seguro. |
| created_at | TIMESTAMP | Fecha de creación del registro. |
| updated_at | TIMESTAMP | Fecha de actualización del registro. |

La tabla utiliza `id` como clave primaria y establece una restricción de unicidad sobre el correo electrónico para evitar registros duplicados. Las contraseñas se almacenan mediante su hash, evitando guardar directamente las credenciales de los usuarios.

## 3. Base de datos de productos (products_db)

Esta base de datos pertenece al microservicio Product Service y administra el catálogo de productos, sus precios, las cantidades disponibles y las reservas de inventario realizadas durante la creación de pedidos.

### Tabla products

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único del producto. |
| name | VARCHAR(150) | Nombre del producto. |
| description | TEXT | Descripción del producto. |
| price | DECIMAL(12,2) | Precio del producto. |
| stock | INTEGER | Cantidad disponible en inventario. |
| created_at | TIMESTAMP | Fecha de creación del registro. |
| updated_at | TIMESTAMP | Fecha de actualización del registro. |

Se implementaron restricciones para impedir que los productos tengan precios negativos o cantidades de inventario inferiores a cero.

### Tabla product_reservations

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único de la reserva. |
| reservation_id | UUID | Identificador único de la operación de reserva. |
| product_id | UUID | Identificador del producto reservado. |
| quantity | INTEGER | Cantidad de unidades reservadas. |
| status | VARCHAR(20) | Estado de la reserva. |
| created_at | TIMESTAMP | Fecha de creación del registro. |
| updated_at | TIMESTAMP | Fecha de actualización del registro. |

Esta tabla permite controlar las reservas de inventario mediante los estados `RESERVED` y `RELEASED`. También cuenta con restricciones para garantizar que las cantidades sean positivas y que los identificadores de reserva no se repitan.

## 4. Base de datos de pedidos (orders_db)

Esta base de datos pertenece al microservicio Order Service y almacena la información de los pedidos realizados por los usuarios, incluyendo sus productos, cantidades, precios y estados de procesamiento.

### Tabla orders

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único del pedido. |
| user_id | UUID | Identificador del usuario que realiza el pedido. |
| total | DECIMAL(12,2) | Valor total del pedido. |
| status | VARCHAR(20) | Estado actual del pedido. |
| created_at | TIMESTAMP | Fecha de creación del pedido. |
| updated_at | TIMESTAMP | Fecha de actualización del pedido. |

Los estados permitidos para los pedidos son `PENDING`, `CONFIRMED` y `FAILED`. También se establecieron restricciones para evitar valores negativos en el total y se crearon índices para facilitar las consultas por usuario y estado.

### Tabla order_items

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único del detalle. |
| product_id | UUID | Identificador del producto. |
| order_id | UUID | Identificador del pedido asociado. |
| product_name | VARCHAR(150) | Nombre del producto al momento de la compra. |
| unit_price | DECIMAL(12,2) | Precio unitario del producto. |
| quantity | INTEGER | Cantidad solicitada. |
| subtotal | DECIMAL(12,2) | Subtotal del producto. |

La tabla `order_items` mantiene una relación de uno a muchos con la tabla `orders`, debido a que un pedido puede contener varios productos. Esta relación se implementa mediante la clave foránea `order_id`, que permite mantener la integridad de los detalles asociados a cada pedido.

Adicionalmente, se almacenan el nombre y el precio del producto al momento de realizar la compra, permitiendo conservar la información utilizada para calcular el pedido, aunque posteriormente cambien los datos del catálogo.

## 5. Base de datos de notificaciones (notifications_db)

Esta base de datos pertenece al microservicio Notification Service y almacena los registros de las notificaciones generadas a partir de los eventos recibidos desde RabbitMQ.

### Tabla notifications

| Campo | Tipo de dato | Descripción |
|---|---|---|
| id | UUID | Identificador único de la notificación. |
| event_id | UUID | Identificador único del evento recibido. |
| user_id | UUID | Identificador del usuario destinatario. |
| order_id | UUID | Identificador del pedido asociado. |
| recipient_email | VARCHAR(150) | Correo electrónico destinatario. |
| type | VARCHAR(50) | Tipo de notificación. |
| message | TEXT | Contenido del mensaje. |
| status | VARCHAR(20) | Estado de procesamiento de la notificación. |
| created_at | TIMESTAMP | Fecha de creación del registro. |
| sent_at | TIMESTAMP | Fecha de envío del correo electrónico. |

Los estados permitidos son `PENDING`, `SENT` y `FAILED`, que permiten identificar si una notificación está pendiente, fue enviada correctamente o presentó un inconveniente durante el envío.

El campo `event_id` tiene una restricción de unicidad que permite evitar el registro duplicado de un mismo evento. Por otra parte, `sent_at` admite valores nulos porque una notificación puede no haber sido enviada todavía.

## 6. Independencia y comunicación entre bases de datos

Una característica importante de la arquitectura implementada es que cada microservicio administra exclusivamente su propia base de datos. Por esta razón, no se utilizan claves foráneas entre bases de datos pertenecientes a diferentes microservicios.

Por ejemplo, Order Service almacena el identificador del usuario en `user_id` y el identificador del producto en `product_id`, pero no establece relaciones físicas con las tablas de User Service o Product Service. Para obtener y validar esta información utiliza las API REST de los servicios correspondientes.

De igual manera, Notification Service conserva los identificadores del usuario y del pedido asociados a cada notificación, sin depender directamente de las bases de datos de los otros componentes.

Esta implementación permite mantener el aislamiento de los datos y facilita que cada microservicio pueda evolucionar y administrar su persistencia de manera independiente.

## 7. Migraciones y bases de datos de pruebas

Para administrar la estructura de las bases de datos se utilizó Sequelize CLI, mediante migraciones que permiten crear y mantener las tablas de cada microservicio de forma controlada y reproducible.

Adicionalmente, se configuraron bases de datos independientes para las pruebas, evitando que la ejecución de los casos de prueba afecte los registros utilizados por la aplicación.

Las bases de datos implementadas son:

| Microservicio | Base de datos de desarrollo | Base de datos de pruebas |
|---|---|---|
| User Service | users_db | users_test_db |
| Product Service | products_db | products_test_db |
| Order Service | orders_db | orders_test_db |
| Notification Service | notifications_db | notifications_test_db |

Finalmente, las migraciones se ejecutan durante el proceso de inicialización de los servicios mediante Docker Compose, permitiendo preparar las estructuras necesarias antes de iniciar la aplicación.