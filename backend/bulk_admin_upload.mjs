import https from 'https';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjI3LCJyb2xlIjoic3VwZXJhZG1pbiIsIm5hbWUiOiJJcmFxQmlkIFN1cGVyIEFkbWluIiwiZW1haWwiOiJzdXBlcmFkbWluQGlyYXFiaWQuY29tIiwic2NvcGUiOiJhZG1pbiIsImlhdCI6MTc5NDc2ODg5NSwiZXhwIjoxNzk3MzYwODk1fQ.VKbxBJLPSwlp9La3HaRuhq9xxgQlqexdOPWChP6p0jA';

// Real curated products matching user's reference image
const curatedProducts = [
  {
    title: 'Kids Camera Instant Print (BLUE-2)',
    description: 'Instant print kids digital camera with thermal printer and full 1080p video recording.',
    startingPrice: 16,
    real_price: 35,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80'
  },
  {
    title: 'Mini Electric Shaver, Portable Powerful Storm',
    description: 'Pocket size rechargeable electric razor with wet/dry IPX7 waterproof rating.',
    startingPrice: 7,
    real_price: 20,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&q=80'
  },
  {
    title: '200W Cordless Hair Dryer with LED Display',
    description: 'High speed negative ionic blow dryer for ultra fast salon styling.',
    startingPrice: 13,
    real_price: 45,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80'
  },
  {
    title: "Emporio Armani Men's Sea Explorer Watch",
    description: 'Luxury quartz stainless steel dive watch with rotating bezel and luminous markers.',
    startingPrice: 300,
    real_price: 550,
    duration: 3,
    category_id: 4, // Watches
    image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80'
  },
  {
    title: 'Lenovo Wireless Earbuds Bluetooth 5.3',
    description: 'True wireless noise cancelling earbuds with deep bass and 36hr charging case.',
    startingPrice: 22,
    real_price: 60,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80'
  },
  {
    title: 'Air Fryer 6L, 1500W Healthy Cooking',
    description: 'Digital touchscreen non-stick air fryer with 8 preset healthy cooking modes.',
    startingPrice: 45,
    real_price: 110,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80'
  },
  {
    title: 'Wireless Game Controller with Dual Vibration',
    description: 'Ergonomic pro gaming gamepad compatible with PS5, PC and Android platforms.',
    startingPrice: 28,
    real_price: 70,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&q=80'
  },
  {
    title: 'JBL Wireless Headphones Noise Cancelling',
    description: 'Premium over-ear wireless studio headphones with 40mm deep bass drivers.',
    startingPrice: 79,
    real_price: 150,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
  },
  {
    title: 'Smart Robot Vacuum Cleaner with Auto Charge',
    description: 'Intelligent laser LiDAR mapping robotic vacuum with multi-surface wet mopping.',
    startingPrice: 120,
    real_price: 280,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'
  },
  {
    title: "Men's Sports Shoes Lightweight & Comfortable",
    description: 'Breathable athletic running trainers with cushioned responsive air sole.',
    startingPrice: 35,
    real_price: 90,
    duration: 3,
    category_id: 2, // Fashion / Shoes
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'
  },
  {
    title: 'Power Bank 20000mAh Fast Charging 22.5W',
    description: 'Ultra slim external battery pack with PD fast charge and dual USB output.',
    startingPrice: 25,
    real_price: 55,
    duration: 3,
    category_id: 9, // Mobiles
    image_url: 'https://images.unsplash.com/photo-1609592807664-89c0b1154c5c?w=600&q=80'
  },
  {
    title: 'WiFi Security Camera 360 HD Night Vision',
    description: 'Smart pan/tilt indoor home surveillance camera with 2K color night vision and motion tracking.',
    startingPrice: 39,
    real_price: 85,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80'
  },
  {
    title: 'Apple iPhone 15 Pro 128GB Blue Titanium',
    description: 'A17 Pro chip, Super Retina XDR display, dynamic island, grade A condition.',
    startingPrice: 750,
    real_price: 999,
    duration: 3,
    category_id: 9, // Mobiles
    image_url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80'
  },
  {
    title: 'Sony PlayStation 5 Slim Digital Console',
    description: '1TB high speed SSD, Ray tracing, 4K 120Hz gaming with DualSense controller.',
    startingPrice: 380,
    real_price: 499,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80'
  },
  {
    title: 'Rolex Submariner Date Ceramic Bezel 41mm',
    description: 'Oystersteel luxury Swiss timepiece with black cerachrom bezel and sapphire crystal.',
    startingPrice: 8500,
    real_price: 12000,
    duration: 3,
    category_id: 4, // Watches
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
  },
  {
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    description: 'Snapdragon 8 Gen 3, 200MP camera system with integrated S-Pen stylus.',
    startingPrice: 820,
    real_price: 1150,
    duration: 3,
    category_id: 9, // Mobiles
    image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80'
  },
  {
    title: 'MacBook Air M2 13.6-inch Midnight',
    description: 'Apple Silicon M2, 8-core CPU, 10-core GPU, 16GB unified memory, 512GB SSD.',
    startingPrice: 790,
    real_price: 1199,
    duration: 3,
    category_id: 10, // Laptops
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80'
  },
  {
    title: 'Dyson V15 Detect Cordless Vacuum Cleaner',
    description: 'Laser reveals invisible dust, LCD screen shows scientific proof of a deep clean.',
    startingPrice: 390,
    real_price: 650,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&q=80'
  },
  {
    title: 'Nike Air Jordan 1 Retro High OG Chicago',
    description: 'Iconic sneaker design, varsity red and white premium leather with original box.',
    startingPrice: 180,
    real_price: 320,
    duration: 3,
    category_id: 2, // Shoes
    image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&q=80'
  },
  {
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    description: 'Industry leading noise cancellation with Auto NC Optimizer, 30-hour battery life.',
    startingPrice: 240,
    real_price: 399,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80'
  },
  {
    title: 'DeLonghi Magnifica S Automatic Coffee Maker',
    description: 'Compact bean-to-cup espresso and cappuccino coffee maker with manual milk frother.',
    startingPrice: 280,
    real_price: 499,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&q=80'
  },
  {
    title: 'TAG Heuer Carrera Chronograph Automatic',
    description: 'Classic sports chronograph with deep blue sunray dial and perforated leather strap.',
    startingPrice: 2100,
    real_price: 3800,
    duration: 3,
    category_id: 4, // Watches
    image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80'
  },
  {
    title: 'iPad Pro 11-inch M4 Ultra Retina XDR',
    description: 'Thinnest Apple product ever, breakthrough tandem OLED display, Apple M4 chip.',
    startingPrice: 850,
    real_price: 1099,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80'
  },
  {
    title: 'DJI Mini 4 Pro Drone with RC 2 Controller',
    description: 'Under 249g folding drone, 4K 60fps HDR video, omnidirectional obstacle sensing.',
    startingPrice: 620,
    real_price: 899,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&q=80'
  },
  {
    title: 'Bose SoundLink Revolve+ II Bluetooth Speaker',
    description: 'Portable 360-degree wireless Bluetooth speaker with water and dust resistant design.',
    startingPrice: 175,
    real_price: 299,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'
  },
  {
    title: 'Ray-Ban Meta Smart Glasses Wayfarer Polarized',
    description: 'Camera and audio smart glasses with 12MP camera, open-ear audio, voice control.',
    startingPrice: 220,
    real_price: 329,
    duration: 3,
    category_id: 2, // Fashion
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80'
  },
  {
    title: 'KitchenAid Artisan Stand Mixer 4.8L Empire Red',
    description: 'Iconic kitchen appliance with 10 speeds, tilt-head design and stainless steel bowl.',
    startingPrice: 320,
    real_price: 499,
    duration: 3,
    category_id: 13, // Home Appliances
    image_url: 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=600&q=80'
  },
  {
    title: 'Dell XPS 15 9530 Intel Core i9 RTX 4070',
    description: '3.5K OLED touchscreen display, 32GB DDR5 RAM, 1TB NVMe PCIe 4.0 SSD.',
    startingPrice: 1450,
    real_price: 2299,
    duration: 3,
    category_id: 10, // Laptops
    image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80'
  },
  {
    title: 'Sony Alpha A7 IV Full-Frame Mirrorless Camera',
    description: '33MP BSI CMOS sensor, 4K 60p 10-bit video, real-time eye autofocus with 28-70mm lens.',
    startingPrice: 1650,
    real_price: 2499,
    duration: 3,
    category_id: 5, // Electronics
    image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80'
  },
  {
    title: 'Casio G-Shock Mudmaster Carbon Core Guard',
    description: 'Shock and mud resistant outdoor tactical watch with solar power and Bluetooth link.',
    startingPrice: 210,
    real_price: 380,
    duration: 3,
    category_id: 4, // Watches
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80'
  }
];

function uploadProduct(prod, index) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(prod);
    const opt = {
      hostname: 'admin.iraqbid.net',
      port: 443,
      path: '/api/admin/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(payload)
      },
      rejectUnauthorized: false
    };

    const req = https.request(opt, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`[${index + 1}/${curatedProducts.length}] OK: ${prod.title}`);
        } else {
          console.log(`[${index + 1}/${curatedProducts.length}] ERR ${res.statusCode}: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', err => {
      console.error(`[${index + 1}] Request error:`, err.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`Starting upload of ${curatedProducts.length} curated products via Admin API...`);
  for (let i = 0; i < curatedProducts.length; i++) {
    await uploadProduct(curatedProducts[i], i);
  }
  console.log('All products processed via Admin API!');
}

run();
