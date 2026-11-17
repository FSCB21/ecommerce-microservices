# E-commerce Microservices

Plataforma de comercio electrónico desarrollada mediante una arquitectura basada en microservicios, como parte del proyecto académico de Arquitectura de Software.

La solución está compuesta por cuatro microservicios independientes encargados de gestionar usuarios, productos, pedidos y notificaciones. Cada servicio administra su propia base de datos PostgreSQL y se comunica con los demás mediante API REST y mensajería asíncrona con RabbitMQ.

## 1. Arquitectura del proyecto

La arquitectura implementa el patrón de microservicios, separando las responsabilidades del sistema en componentes independientes. Cada uno puede ejecutarse y administrarse de manera autónoma.

Los microservicios implementados son:

| Microservicio | Responsabilidad | Puerto |
|---|---|---|
| User Service | Registro, autenticación y consulta de usuarios. | 3001 |
| Product Service | Administración del catálogo y control de inventario. | 3002 |
| Order Service | Creación, consulta y confirmación de pedidos. | 3003 |
| Notification Service | Procesamiento de eventos y envío de notificaciones por correo electrónico. | 3004 |

### Diagrama general

La siguiente documentación presenta la arquitectura implementada y la comunicación entre sus componentes:

[Consultar el diagrama de arquitectura](docs/diagrams/architecture.md)

## 2. Tecnologías utilizadas

- **Node.js:** entorno de ejecución para los microservicios.
- **Express:** framework para la construcción de las API REST.
- **PostgreSQL:** sistema de gestión de bases de datos relacional.
- **Sequelize:** ORM utilizado para la comunicación con las bases de datos y la administración de migraciones.
- **RabbitMQ:** sistema de mensajería para la comunicación asíncrona entre servicios.
- **Nodemailer:** herramienta utilizada para gestionar el envío de correos electrónicos.
- **Ethereal Email:** servidor SMTP de pruebas utilizado para verificar el envío de mensajes.
- **Docker:** herramienta para contenerizar los microservicios y la infraestructura.
- **Docker Compose:** herramienta para definir y ejecutar los componentes del sistema.
- **Jest:** framework para la ejecución de pruebas automatizadas.
- **Supertest:** herramienta para realizar pruebas de las API.

## 3. Estructura del proyecto

El repositorio está organizado de la siguiente manera:

```text
ecommerce-microservices/
│
├── services/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   └── notification-service/
│
├── infrastructure/
│   └── docker/
│       └── postgres/
│           └── init/
│
├── docs/
│   ├── diagrams/
│   └── documentation/
│
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
└── README.md
```

Cada carpeta dentro de `services` contiene el código fuente, las configuraciones, las migraciones y las pruebas correspondientes a su microservicio.

## 4. Bases de datos

Cada microservicio administra una base de datos PostgreSQL independiente:

| Microservicio | Base de datos |
|---|---|
| User Service | `users_db` |
| Product Service | `products_db` |
| Order Service | `orders_db` |
| Notification Service | `notifications_db` |

También se configuraron bases de datos independientes para las pruebas:

- `users_test_db`
- `products_test_db`
- `orders_test_db`
- `notifications_test_db`

La separación de las bases de datos permite mantener el aislamiento de la información y evita dependencias directas entre las estructuras internas de los diferentes microservicios.

## 5. Comunicación entre microservicios

La solución utiliza dos mecanismos principales de comunicación:

### Comunicación síncrona mediante API REST

Order Service se comunica con User Service para consultar la información del usuario y con Product Service para consultar productos y gestionar las reservas de inventario.

### Comunicación asíncrona mediante RabbitMQ

Cuando un pedido es confirmado, Order Service publica un evento denominado `order.confirmed` en RabbitMQ.

Notification Service permanece escuchando la cola `order_notifications_queue` y, cuando recibe el evento, registra la notificación y gestiona el envío del correo electrónico mediante Nodemailer y el servidor SMTP de pruebas.

Se implementaron mecanismos de reconexión para RabbitMQ y controles de identificación de eventos para evitar el registro duplicado de notificaciones.

## 6. Requisitos previos

Para ejecutar el proyecto localmente se requiere:

- Docker Desktop instalado y en ejecución.
- Docker Compose disponible.
- Git para clonar el repositorio.
- Un archivo de configuración `.env` con las variables de entorno necesarias.

## 7. Instalación y ejecución

### 7.1. Clonar el repositorio

```bash
git clone https://github.com/FSCB21/ecommerce-microservices.git
cd ecommerce-microservices
```

### 7.2. Configurar las variables de entorno

Crear el archivo `.env` a partir del archivo de ejemplo:

```bash
cp .env.example .env
```

Después, configurar los valores correspondientes para PostgreSQL, RabbitMQ, JWT y el servidor SMTP.

**Importante:** reemplazar los valores de ejemplo por las credenciales correspondientes. No publicar el archivo `.env` ni compartir credenciales reales en el repositorio.

### 7.3. Construir e iniciar los servicios

Desde la raíz del proyecto, ejecutar:

```bash
docker compose up -d --build
```

Este comando construye las imágenes de los microservicios e inicia los contenedores definidos en Docker Compose.

Durante el proceso se ejecutan las tareas de inicialización de las bases de datos, incluyendo las migraciones y los datos iniciales configurados para los servicios correspondientes.

### 7.4. Verificar el estado de los contenedores

```bash
docker compose ps -a
```

Para consultar los registros de ejecución:

```bash
docker compose logs -f
```

Para consultar los registros de un microservicio específico:

```bash
docker compose logs -f order-service
```

## 8. Puertos y endpoints de verificación

Los servicios exponen los siguientes endpoints de salud:

| Microservicio | Endpoint |
|---|---|
| User Service | `http://localhost:3001/health/` |
| Product Service | `http://localhost:3002/health` |
| Order Service | `http://localhost:3003/health` |
| Notification Service | `http://localhost:3004/health` |

Cada endpoint permite comprobar que el microservicio se encuentra disponible.

Las API principales se encuentran disponibles en las siguientes rutas:

| Microservicio | Ruta base |
|---|---|
| User Service | `http://localhost:3001/api/users` |
| Product Service | `http://localhost:3002/api/products` |
| Order Service | `http://localhost:3003/api/orders` |
| Notification Service | `http://localhost:3004/api/notifications` |

### RabbitMQ Management

La interfaz de administración de RabbitMQ está disponible en:

`http://localhost:15672`

Se debe ingresar con las credenciales configuradas en el archivo `.env`.

## 9. Ejecución de pruebas

Cada microservicio dispone de pruebas unitarias, de API y de integración implementadas con Jest.

Para ejecutar las pruebas, ingresar a la carpeta del microservicio correspondiente y utilizar los siguientes comandos:

```bash
npm test
```

Para ejecutar las pruebas unitarias y de API:

```bash
npm run test:unit
```

Para ejecutar las pruebas de integración:

```bash
npm run test:integration
```

Estos comandos están disponibles en los cuatro microservicios y utilizan bases de datos de pruebas independientes.

## 10. Detener los servicios

Para detener los contenedores del proyecto, ejecutar:

```bash
docker compose down
```

Los datos persistentes se mantienen en los volúmenes de Docker, por lo que detener los servicios de esta manera no elimina las bases de datos almacenadas.

## 11. Documentación adicional

El proyecto cuenta con documentación complementaria sobre su arquitectura, diseño de bases de datos y pruebas:

| Documento | Descripción |
|---|---|
| [Diagrama de arquitectura](docs/diagrams/architecture.md) | Representación general de los microservicios y sus mecanismos de comunicación. |
| [Diseño de bases de datos](docs/documentation/database.md) | Estructura de las bases de datos, tablas, campos y restricciones. |
| [Documentación de pruebas](docs/documentation/testing.md) | Organización, herramientas y ejecución de las pruebas automatizadas. |

También se incluyen diagramas elaborados durante el diseño del sistema:

- [Diagrama de actividades](docs/diagrams/Diagrama%20De%20Actividades.png)
- [Diagrama de despliegue](docs/diagrams/Diagrama%20De%20Despliegue.png)
- [Diagrama entidad-relación](docs/diagrams/Diagrama%20Entidad-Relacion_.png)
- [Diagrama de componentes](docs/diagrams/diagrama_componentes.png)
- [Diagrama del proceso de compra](docs/diagrams/diagrama_componentes-Proceso%20Compra.png)

## 12. Repositorio

El código fuente del proyecto se encuentra disponible en GitHub:

[https://github.com/FSCB21/ecommerce-microservices](https://github.com/FSCB21/ecommerce-microservices)