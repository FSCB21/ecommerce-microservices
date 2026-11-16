
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    product_name: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    tableName: 'order_items',
    timestamps: false
});

export default OrderItem;
