
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('notifications', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            event_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            order_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            recipient_email: {
                type: Sequelize.STRING(150),
                allowNull: false
            },
            type: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            message: {
                type: Sequelize.TEXT,
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
            sent_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            }
        });

        await queryInterface.addConstraint('notifications', {
            fields: ['status'],
            type: 'check',
            name: 'notifications_status_check',
            where: {
                status: ['PENDING', 'SENT', 'FAILED']
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('notifications');
    }
};
