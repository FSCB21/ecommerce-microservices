
'use strict';

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false
        },
        product_id: {
            type: Sequelize.UUID,
            allowNull: false
        },
        order_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        product_name: {
            type: Sequelize.STRING(150),
            allowNull: false
        },
        unit_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false
        },
        quantity: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        subtotal: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false
        }
    });

    await queryInterface.addConstraint('order_items', {
        fields: ['unit_price'],
        type: 'check',
        where: {
            unit_price: {
                [Sequelize.Op.gte]: 0
            }
        },
        name: 'order_items_unit_price_check'
    });

    await queryInterface.addConstraint('order_items', {
        fields: ['quantity'],
        type: 'check',
        where: {
            quantity: {
                [Sequelize.Op.gt]: 0
            }
        },
        name: 'order_items_quantity_check'
    });

    await queryInterface.addConstraint('order_items', {
        fields: ['subtotal'],
        type: 'check',
        where: {
            subtotal: {
                [Sequelize.Op.gte]: 0
            }
        },
        name: 'order_items_subtotal_check'
    });

    await queryInterface.addIndex('order_items', ['order_id'], {
        name: 'order_items_order_id_idx'
    });

    await queryInterface.addIndex('order_items', ['product_id'], {
        name: 'order_items_product_id_idx'
    });
}

export async function down(queryInterface) {
    await queryInterface.dropTable('order_items');
}
