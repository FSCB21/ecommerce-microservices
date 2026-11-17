# Documentación de pruebas

## 1. Introducción

Para verificar el correcto funcionamiento de la arquitectura de microservicios E-commerce Microservices, se implementó una estructura de pruebas automatizadas utilizando Jest como framework principal. Estas pruebas permiten validar el comportamiento de cada componente, comprobar las respuestas de las API y verificar la interacción con los elementos necesarios para su funcionamiento.

Cada microservicio cuenta con su propio conjunto de pruebas, manteniendo la independencia de ejecución y evitando que los datos utilizados durante las validaciones afecten las bases de datos de desarrollo.

## 2. Organización de las pruebas

Las pruebas se encuentran dentro de la carpeta `tests` de cada microservicio y están organizadas en tres categorías:

### 2.1. Pruebas unitarias

Se utilizan para verificar el comportamiento de los servicios y sus principales operaciones de negocio de manera individual. Permiten identificar errores en la lógica implementada sin depender necesariamente del funcionamiento completo de la aplicación.

### 2.2. Pruebas de API

Se utilizan para comprobar los endpoints expuestos por cada microservicio, validando las solicitudes HTTP, los datos recibidos y las respuestas generadas por los controladores.

### 2.3. Pruebas de integración

Permiten verificar el funcionamiento conjunto de los componentes de cada microservicio, incluyendo su interacción con la base de datos y otros elementos necesarios para ejecutar las operaciones implementadas.

## 3. Estructura de pruebas por microservicio

Cada microservicio cuenta con tres archivos principales de pruebas:

| Microservicio | Pruebas unitarias | Pruebas de API | Pruebas de integración |
|---|---|---|---|
| User Service | `tests/unit/user.service.test.js` | `tests/api/user.routes.test.js` | `tests/integration/user.integration.test.js` |
| Product Service | `tests/unit/product.service.test.js` | `tests/api/product.api.test.js` | `tests/integration/product.integration.test.js` |
| Order Service | `tests/unit/order.service.test.js` | `tests/api/order.api.test.js` | `tests/integration/order.integration.test.js` |
| Notification Service | `tests/unit/notification.service.test.js` | `tests/api/notification.api.test.js` | `tests/integration/notification.integration.test.js` |

Esta organización permite mantener las pruebas separadas según el tipo de validación y facilita su mantenimiento cuando se incorporan nuevas funcionalidades.

## 4. Herramientas utilizadas

Para implementar y ejecutar las pruebas se utilizaron las siguientes herramientas:

- **Jest:** framework utilizado para definir y ejecutar las pruebas automatizadas.
- **Supertest:** herramienta utilizada para realizar solicitudes HTTP y verificar las respuestas de las API.
- **Sequelize:** utilizado para gestionar la conexión con PostgreSQL durante las pruebas que requieren acceso a la base de datos.
- **Cross-env:** permite establecer variables de entorno para ejecutar las pruebas con la configuración correspondiente.

## 5. Bases de datos de pruebas

Para mantener aislados los datos utilizados durante las validaciones, cada microservicio cuenta con una base de datos independiente destinada a las pruebas:

| Microservicio | Base de datos |
|---|---|
| User Service | `users_test_db` |
| Product Service | `products_test_db` |
| Order Service | `orders_test_db` |
| Notification Service | `notifications_test_db` |

Los comandos generales de prueba establecen la variable `POSTGRES_DB` correspondiente a cada microservicio, permitiendo ejecutar las validaciones sobre estas bases de datos y mantener separados los registros de desarrollo.

## 6. Ejecución de las pruebas

Cada microservicio dispone de scripts configurados en su archivo `package.json` para ejecutar las diferentes categorías de pruebas.

Para ejecutar todas las pruebas de un microservicio:

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

Estos comandos deben ejecutarse desde la carpeta del microservicio correspondiente. Por ejemplo, para ejecutar las pruebas de Order Service:

```bash
cd services/order-service
npm test
```

La misma estructura de comandos se encuentra configurada en User Service, Product Service y Notification Service.

## 7. Consideraciones de ejecución

Las pruebas utilizan Jest con la opción `--runInBand`, que permite ejecutar los archivos de prueba de manera secuencial en un solo proceso. Esto facilita el manejo de recursos compartidos, especialmente cuando se realizan operaciones sobre bases de datos.

Adicionalmente, las pruebas de integración utilizan las bases de datos de pruebas correspondientes a cada servicio, por lo que es necesario contar con PostgreSQL disponible y con la configuración adecuada de las variables de entorno.

## 8. Conclusión

La implementación de pruebas automatizadas permite verificar diferentes aspectos del funcionamiento de cada microservicio, desde la lógica de negocio hasta las respuestas de sus API y la interacción con otros componentes. La separación entre pruebas unitarias, de API e integración facilita la identificación de posibles errores y contribuye a mantener la calidad del software durante su desarrollo y evolución.