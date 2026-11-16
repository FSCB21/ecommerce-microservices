
'use strict';

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(150),
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false
        },
        stock: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });

    await queryInterface.addConstraint('products', {
        fields: ['price'],
        type: 'check',
        where: {
            price: {
                [Sequelize.Op.gte]: 0
            }
        },
        name: 'products_price_non_negative'
    });

    await queryInterface.addConstraint('products', {
        fields: ['stock'],
        type: 'check',
        where: {
            stock: {
                [Sequelize.Op.gte]: 0
            }
        },
        name: 'products_stock_non_negative'
    });
}

export async function down(queryInterface) {
    await queryInterface.dropTable('products');
}
