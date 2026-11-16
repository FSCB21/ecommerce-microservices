
'use strict';

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_reservations', {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false
        },
        reservation_id: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true
        },
        product_id: {
            type: Sequelize.UUID,
            allowNull: false
        },
        quantity: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'RESERVED'
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

    await queryInterface.addConstraint('product_reservations', {
        fields: ['quantity'],
        type: 'check',
        where: {
            quantity: {
                [Sequelize.Op.gt]: 0
            }
        },
        name: 'product_reservations_quantity_positive'
    });

    await queryInterface.addConstraint('product_reservations', {
        fields: ['status'],
        type: 'check',
        where: {
            status: ['RESERVED', 'RELEASED']
        },
        name: 'product_reservations_status_valid'
    });

    await queryInterface.addIndex(
        'product_reservations',
        ['product_id'],
        {
            name: 'product_reservations_product_id_idx'
        }
    );
}

export async function down(queryInterface) {
    await queryInterface.dropTable('product_reservations');
}
