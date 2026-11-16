
'use strict';

module.exports = {
    async up(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Insertar pedidos de demostración
            await queryInterface.sequelize.query(`
                INSERT INTO orders (
                    id,
                    user_id,
                    total,
                    status,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    '5208b265-08d8-4f3f-a785-86d51d226a1a',
                    'b1000000-0000-4000-8000-000000000001',
                    239700.00,
                    'PENDING',
                    NOW(),
                    NOW()
                ),
                (
                    'c639ba30-7e84-4fc2-b09c-c069b42894e1',
                    'b1000000-0000-4000-8000-000000000001',
                    239700.00,
                    'PENDING',
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING;
            `, { transaction });

            // Insertar detalles de los pedidos sin duplicarlos
            await queryInterface.sequelize.query(`
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    unit_price,
                    quantity,
                    subtotal
                )
                SELECT
                    data.order_id::UUID,
                    data.product_id::UUID,
                    data.product_name,
                    data.unit_price,
                    data.quantity,
                    data.subtotal
                FROM (
                    VALUES
                    (
                        '5208b265-08d8-4f3f-a785-86d51d226a1a',
                        'a1000000-0000-4000-8000-000000000009',
                        'Parlante JBL Go 4',
                        179900.00,
                        1,
                        179900.00
                    ),
                    (
                        '5208b265-08d8-4f3f-a785-86d51d226a1a',
                        'a1000000-0000-4000-8000-000000000010',
                        'Cable USB-C',
                        29900.00,
                        2,
                        59800.00
                    ),
                    (
                        'c639ba30-7e84-4fc2-b09c-c069b42894e1',
                        'a1000000-0000-4000-8000-000000000009',
                        'Parlante JBL Go 4',
                        179900.00,
                        1,
                        179900.00
                    ),
                    (
                        'c639ba30-7e84-4fc2-b09c-c069b42894e1',
                        'a1000000-0000-4000-8000-000000000010',
                        'Cable USB-C',
                        29900.00,
                        2,
                        59800.00
                    )
                ) AS data(
                    order_id,
                    product_id,
                    product_name,
                    unit_price,
                    quantity,
                    subtotal
                )
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM order_items existing
                    WHERE existing.order_id = data.order_id::UUID
                      AND existing.product_id = data.product_id::UUID
                );
            `, { transaction });

            await transaction.commit();

            console.log('Pedidos de demostración insertados correctamente');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            const orderIds = [
                '5208b265-08d8-4f3f-a785-86d51d226a1a',
                'c639ba30-7e84-4fc2-b09c-c069b42894e1'
            ];

            await queryInterface.bulkDelete(
                'orders',
                { id: orderIds },
                { transaction }
            );
        });
    }
};
