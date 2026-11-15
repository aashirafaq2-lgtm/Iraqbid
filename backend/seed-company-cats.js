
import pool from './src/config/db.js';

async function seedCompanyProducts() {
    try {
        const categories = [4, 9, 10, 6, 7]; // Watches, Mobiles, Laptops, Fashion, Furniture
        const titles = ['Premium Watch', 'Smartphone X', 'WorkStation Pro', 'Summer Collection', 'Modern Sofa'];

        for (let i = 0; i < categories.length; i++) {
            await pool.query(`
            INSERT INTO products (
                title, description, starting_price, current_price, 
                category_id, seller_id, status, image_url, 
                auction_end_time, duration
            ) VALUES (
                $1, $2, $3, $4, $5, NULL, 'approved', 
                'https://res.cloudinary.com/df9m0futv/image/upload/v1764970801/banners/qswz0hk8xbuci6hj6sbz.jpg',
                NOW() + INTERVAL '7 days', 7
            )
        `, [titles[i], `Description for ${titles[i]}`, 100 + (i * 50), 100 + (i * 50), categories[i]]);
        }

        console.log('✅ Seeded 5 Company Products in different categories');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedCompanyProducts();
