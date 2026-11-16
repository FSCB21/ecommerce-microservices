
'use strict';

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false
        },
        user_id: {
            type: Sequelize.UUID,
            allowNull: false
        },
        total: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false
        },
        status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'PENDING'
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

    await queryInterface.addConstraint('orders', {
        fields: ['total'],
        type: 'check',
        where: {
            total: {
                [Sequelize.Op.gte]: 0
            }
        },
        name: 'orders_total_check'
    });

    await queryInterface.addConstraint('orders', {
        fields: ['status'],
        type: 'check',
        where: {
            status: ['PENDING', 'CONFIRMED', 'FAILED']
        },
        name: 'orders_status_check'
    });

    await queryInterface.addIndex('orders', ['user_id'], {
        name: 'orders_user_id_idx'
    });

    await queryInterface.addIndex('orders', ['status'], {
        name: 'orders_status_idx'
    });
}

export async function down(queryInterface) {
    await queryInterface.dropTable('orders');
}
