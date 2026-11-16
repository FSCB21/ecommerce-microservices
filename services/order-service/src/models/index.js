
import Order from './Order.js';
import OrderItem from './OrderItem.js';

// Un pedido puede tener varios detalles
Order.hasMany(OrderItem, {
    foreignKey: 'order_id',
    as: 'items',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
});

// Cada detalle pertenece a un pedido
OrderItem.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order'
});

export {
    Order,
    OrderItem
};
