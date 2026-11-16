
class Product {
    constructor({
        id = null,
        name,
        description = null,
        price,
        stock = 0,
        created_at = null,
        updated_at = null
    }) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = Number(price);
        this.stock = Number(stock);
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static fromDatabase(row) {
        if (!row) return null;

        return new Product(row);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            price: this.price,
            stock: this.stock,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default Product;
