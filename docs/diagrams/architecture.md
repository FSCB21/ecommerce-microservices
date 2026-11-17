
# Diagrama de arquitectura de microservicios

## Arquitectura general

```mermaid
flowchart TB
    Client["Cliente / Aplicación"]

    subgraph Docker["Docker Compose"]
        subgraph Services["Microservicios"]
            US["User Service<br/>Node.js + Express<br/>Puerto 3001"]
            PS["Product Service<br/>Node.js + Express<br/>Puerto 3002"]
            OS["Order Service<br/>Node.js + Express<br/>Puerto 3003"]
            NS["Notification Service<br/>Node.js + Express<br/>Puerto 3004"]
        end

        subgraph Databases["Bases de datos independientes"]
            UDB[("users_db")]
            PDB[("products_db")]
            ODB[("orders_db")]
            NDB[("notifications_db")]
        end

        MQ[("RabbitMQ<br/>order_notifications_queue")]
    end

    SMTP["Servidor SMTP<br/>Ethereal Email"]

    Client --> US
    Client --> PS
    Client --> OS
    Client --> NS

    US --> UDB
    PS --> PDB
    OS --> ODB
    NS --> NDB

    OS -->|"REST: consultar usuario"| US
    OS -->|"REST: consultar producto<br/>y reservar inventario"| PS

    OS -->|"Evento order.confirmed"| MQ
    MQ -->|"Consumo asíncrono"| NS

    NS -->|"Envío de correo"| SMTP
```

## Descripción

La arquitectura implementada está compuesta por cuatro microservicios independientes, cada uno con responsabilidades específicas y su propia base de datos PostgreSQL. La comunicación entre los servicios se realiza mediante API REST para las operaciones síncronas y RabbitMQ para el intercambio asíncrono de eventos.

El microservicio de pedidos se comunica con los servicios de usuarios y productos para validar la información necesaria durante la creación y confirmación de pedidos. Una vez confirmado un pedido, publica un evento en RabbitMQ que es consumido por el microservicio de notificaciones, encargado de registrar la notificación y gestionar el envío del correo electrónico mediante Nodemailer y un servidor SMTP.

Los componentes se ejecutan mediante Docker Compose, lo que permite centralizar su configuración, construcción y despliegue.
