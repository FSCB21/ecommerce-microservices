
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    recipient_email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDING',
        validate: {
            isIn: [['PENDING', 'SENT', 'FAILED']]
        }
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'notifications',
    timestamps: false
});

export default Notification;
