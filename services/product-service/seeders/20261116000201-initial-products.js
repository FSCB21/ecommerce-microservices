
'use strict';

const products = [
    {
        id: 'a1000000-0000-4000-8000-000000000001',
        name: 'Laptop Lenovo IdeaPad',
        description: 'Portátil con 16 GB de RAM y SSD de 512 GB',
        price: 2899900.00,
        stock: 15
    },
    {
        id: 'a1000000-0000-4000-8000-000000000002',
        name: 'Mouse Logitech M170',
        description: 'Mouse inalámbrico con conexión USB',
        price: 59900.00,
        stock: 40
    },
    {
        id: 'a1000000-0000-4000-8000-000000000003',
        name: 'Teclado mecánico Redragon',
        description: 'Teclado mecánico RGB con conexión USB',
        price: 189900.00,
        stock: 20
    },
    {
        id: 'a1000000-0000-4000-8000-000000000004',
        name: 'Monitor Samsung 27 pulgadas',
        description: 'Monitor Full HD de 27 pulgadas',
        price: 799900.00,
        stock: 12
    },
    {
        id: 'a1000000-0000-4000-8000-000000000005',
        name: 'Audífonos JBL Tune 520BT',
        description: 'Audífonos inalámbricos Bluetooth',
        price: 199900.00,
        stock: 25
    },
    {
        id: 'a1000000-0000-4000-8000-000000000006',
        name: 'Disco SSD Kingston 1TB',
        description: 'Unidad de almacenamiento SSD de 1 TB',
        price: 349900.00,
        stock: 18
    },
    {
        id: 'a1000000-0000-4000-8000-000000000007',
        name: 'Webcam Logitech C920',
        description: 'Cámara web Full HD 1080p',
        price: 329900.00,
        stock: 10
    },
    {
        id: 'a1000000-0000-4000-8000-000000000008',
        name: 'Memoria RAM Kingston 16GB',
        description: 'Módulo de memoria RAM DDR4 de 16 GB',
        price: 159900.00,
        stock: 30
    },
    {
        id: 'a1000000-0000-4000-8000-000000000009',
        name: 'Parlante JBL Go 4',
        description: 'Parlante portátil Bluetooth resistente al agua',
        price: 179900.00,
        stock: 0
    },
    {
        id: 'a1000000-0000-4000-8000-000000000010',
        name: 'Cable USB-C',
        description: 'Cable de carga y transferencia de datos',
        price: 29900.00,
        stock: 50
    }
];

export async function up(queryInterface) {
    const now = new Date();

    for (const product of products) {
        await queryInterface.bulkInsert('products', [{
            ...product,
            created_at: now,
            updated_at: now
        }], {
            ignoreDuplicates: true
        });
    }

    console.log('Productos iniciales insertados sin duplicar registros existentes');
}

export async function down(queryInterface) {
    await queryInterface.bulkDelete('products', {
        id: products.map(product => product.id)
    });
}
