/* ============================================================
   A&M Hair & Beauty — data.js
   All product data, site text, and configuration in one place.
   ============================================================ */

// ---- STRIPE CONFIG ----
// Replace YOUR_STRIPE_PAYMENT_LINK with your actual Stripe Payment Link.
// Stripe Payment Links support ?prefilled_amount=XXXX (in pence/cents).
// You can create one at: https://dashboard.stripe.com/payment-links
// Example URL: https://buy.stripe.com/test_XXXXXXXX
const AM_CONFIG = {
    stripeLinkBase: 'https://buy.stripe.com/14A28seVp07E1ta8mZ6Zy04',
    // Currency code for display
    currency: 'GBP',
    currencySymbol: '£',
    // Shop fallback URL
    shopUrl: 'https://shop.amhairandbeauty.com',
    authUrl: 'https://auth.amhairandbeauty.com',
    siteUrl: 'https://amhairandbeauty.com',
};

// ---- PRODUCTS ----
const AM_PRODUCTS = [
    {
        id: 'hair-growth-oil-100ml',
        name: 'Hair Growth Oil',
        subtitle: '100ml Premium Formula',
        price: 9.99,
        image: 'big hair oil.jpg',
        images: ['big hair oil.jpg'],
        category: 'oils',
        badge: 'Best Seller',
        description: 'Our signature 100ml hair growth oil is a rich, concentrated blend of natural oils that nourishes your scalp, stimulates follicles, and promotes stronger, longer hair. Suitable for all hair types.',
        features: [
            '100% natural ingredients',
            'Promotes hair growth and thickness',
            'Nourishes and moisturises the scalp',
            'Adds brilliant shine',
            'Suitable for all hair types',
            'No harsh chemicals or sulphates',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/hair-growth-oil',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'satin-bonnet',
        name: 'Satin Bonnet',
        subtitle: 'Protective Hair Bonnet',
        price: 2.99,
        image: 'good bonnet.jpg',
        images: ['good bonnet.jpg'],
        category: 'accessories',
        badge: 'Popular',
        description: 'Protect your hair while you sleep with our luxuriously smooth satin bonnet. Locks in moisture, reduces friction, and prevents breakage so you wake up with healthier hair every morning.',
        features: [
            'High-quality satin interior',
            'Elastic band for secure fit',
            'Reduces friction and breakage',
            'Locks in overnight moisture',
            'Suitable for all hair types and lengths',
            'One size fits most',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/satin-bonnet',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'rosemary-hair-oil-60ml',
        name: 'Rosemary Hair Oil',
        subtitle: '60ml Concentrated Formula',
        price: 4.99,
        image: 'small hair oil.jpg',
        images: ['small hair oil.jpg'],
        category: 'oils',
        badge: null,
        description: 'Our 60ml rosemary hair oil is a potent, travel-friendly formula packed with natural rosemary extract and nourishing botanicals. Stimulates the scalp, strengthens strands, and encourages healthy growth.',
        features: [
            'Rosemary extract as key ingredient',
            'Compact 60ml for on-the-go use',
            'Stimulates scalp circulation',
            'Strengthens hair from root to tip',
            'Lightweight, non-greasy formula',
            'Vegan and cruelty-free',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/hair-growth-oil-1',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'shampoo',
        name: 'Nourishing Shampoo',
        subtitle: 'Natural Cleansing Formula',
        price: 12.99,
        image: 'shampoo.jpg',
        images: ['shampoo.jpg'],
        category: 'haircare',
        badge: 'New',
        description: 'A gentle yet effective cleansing shampoo formulated with natural ingredients that lift dirt and build-up without stripping your hair of its natural oils. Leaves hair feeling clean, soft, and refreshed.',
        features: [
            'Sulphate-free formula',
            'Infused with natural botanicals',
            'Cleanses without stripping moisture',
            'Suitable for colour-treated hair',
            'Rich, creamy lather',
            'Paraben-free',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/untitled-sep26_07-47',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'conditioner',
        name: 'Deep Conditioner',
        subtitle: 'Intense Moisture Treatment',
        price: 9.99,
        image: 'conditioner.jpg',
        images: ['conditioner.jpg'],
        category: 'haircare',
        badge: 'New',
        description: 'Replenish lost moisture and restore elasticity with our deep conditioning treatment. Packed with nourishing butters and oils, it detangles, softens, and strengthens every strand.',
        features: [
            'Deep moisturising formula',
            'Detangles with ease',
            'Restores elasticity and shine',
            'Suitable for dry and damaged hair',
            'Can be used as a leave-in or rinse-out',
            'Free from silicones and parabens',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/conditioner',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'pomade',
        name: 'Pomade',
        subtitle: 'Edge & Style Control',
        price: 4.99,
        image: 'Pomade.jpg',
        images: ['Pomade.jpg'],
        category: 'styling',
        badge: null,
        description: 'Get sleek edges and defined styles with our all-day hold pomade. Lightweight enough to avoid build-up yet strong enough to keep every strand in place. Non-flaking and humidity resistant.',
        features: [
            'Strong, flexible hold',
            'Humidity and sweat resistant',
            'Non-flaking formula',
            'Defines and lays edges',
            'Adds a healthy sheen',
            'Easy water wash-out',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/pomade',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'sisal-soap-bag',
        name: 'Sisal Soap Bag',
        subtitle: 'Exfoliating Soap Pouch',
        price: 2.59,
        image: 'IMG_9162.PNG',
        images: ['IMG_9162.PNG'],
        category: 'accessories',
        badge: null,
        description: 'A natural sisal fibre bag that creates a rich lather while gently exfoliating your skin. Perfect for use with any bar soap. Eco-friendly, reusable, and biodegradable.',
        features: [
            '100% natural sisal fibre',
            'Creates a rich, luxurious lather',
            'Gentle exfoliation for smooth skin',
            'Reusable and biodegradable',
            'Drawstring closure',
            'Suitable for all skin types',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/sisal-soap-bags',
        inStock: true,
        discontinued: false,
    },
    {
        id: 'turmeric-soap',
        name: 'Turmeric Soap',
        subtitle: 'Brightening Bar Soap',
        price: 3.49,
        image: 'tumeric.jpg',
        images: ['tumeric.jpg'],
        category: 'skincare',
        badge: null,
        description: 'Harness the brightening power of turmeric in our handcrafted bar soap. Naturally reduces the appearance of dark spots, evens skin tone, and leaves your skin glowing and refreshed.',
        features: [
            'Real turmeric extract',
            'Brightens and evens skin tone',
            'Reduces dark spots over time',
            'Handcrafted in small batches',
            'Gentle enough for daily use',
            'Contains shea butter and coconut oil',
        ],
        shopUrl: 'https://shop.amhairandbeauty.com/products/tumeric-soap',
        inStock: true,
        discontinued: false,
    },
    // Discontinued products
    {
        id: 'valentine-hamper',
        name: 'Valentine Hamper',
        subtitle: 'Limited Edition Gift Set',
        price: 39.99,
        image: 'valentinehamper.png',
        images: ['valentinehamper.png'],
        category: 'bundles',
        badge: 'Discontinued',
        description: 'Our sold-out Valentine gift hamper — a curated collection of our best-loved hair care products, beautifully packaged for gifting.',
        features: ['Curated product selection', 'Beautiful gift packaging', 'Suitable for all hair types'],
        shopUrl: null,
        inStock: false,
        discontinued: true,
    },
    {
        id: 'valentine-hamper-plus',
        name: 'Valentine Hamper +',
        subtitle: 'Premium Limited Edition',
        price: 49.99,
        image: 'IMG_1753.png',
        images: ['IMG_1753.png'],
        category: 'bundles',
        badge: 'Discontinued',
        description: 'Our premium Valentine hamper with an extended selection of hair and beauty products. This edition has now sold out.',
        features: ['Extended premium selection', 'Luxury gift packaging', 'Our most popular gift set'],
        shopUrl: null,
        inStock: false,
        discontinued: true,
    },
];

// ---- CATEGORIES ----
const AM_CATEGORIES = [
    { id: 'all', label: 'All Products' },
    { id: 'oils', label: 'Hair Oils' },
    { id: 'haircare', label: 'Hair Care' },
    { id: 'styling', label: 'Styling' },
    { id: 'skincare', label: 'Skin Care' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'bundles', label: 'Bundles' },
];

// ---- ABOUT PAGE TEXT ----
const AM_ABOUT = {
    headline: 'Our Story',
    intro: 'At A&M Hair Beauty, our journey began from personal experience. My hair was breaking, dry, and seemed impossible to grow — no matter what I tried.',
    body: [
        'I tried every product on the market. Nothing worked. So I started researching, experimenting, and blending my own formulas using the finest natural ingredients I could find.',
        'Through dedication, late nights, and an unshakeable belief that there had to be a better way, I developed a blend that transformed my hair — making it longer, stronger, and full of shine.',
        'A&M Hair Beauty was born from a passion to help people regain confidence in their natural beauty. Every product we create goes through the same personal testing and high standards that led to that first breakthrough.',
    ],
    tagline: 'We believe that when your hair is healthy, you feel empowered. 🌿✨',
    stats: [
        { num: '500+', label: 'Happy customers' },
        { num: '100%', label: 'Natural ingredients' },
        { num: '5★', label: 'Average rating' },
    ],
    values: [
        { icon: '🌿', title: 'All Natural', body: 'We use only the finest natural ingredients — no harsh chemicals, sulphates, or parabens ever.' },
        { icon: '🧪', title: 'Tested & Proven', body: 'Every product is tested on ourselves and trusted customers before it reaches your door.' },
        { icon: '💜', title: 'Community First', body: "We're a small business built on love — your support directly fuels every new product we create." },
        { icon: '♻️', title: 'Sustainable', body: 'We minimise our environmental footprint with eco-conscious packaging and responsible sourcing.' },
    ],
};

// ---- NAV LINKS ----
const AM_NAV = [
    { label: 'Products', href: 'products.html' },
    { label: 'About', href: 'about.html' },
    { label: 'Reviews', href: 'index.html#reviews' },
    { label: 'Shop', href: AM_CONFIG.shopUrl },
];

// ---- FOOTER LINKS ----
const AM_FOOTER = {
    tagline: 'Premium natural hair care products handcrafted with love. Transforming hair, one bottle at a time.',
    columns: [
        {
            heading: 'Shop',
            links: [
                { label: 'All Products', href: 'products.html' },
                { label: 'Hair Oils', href: 'products.html?cat=oils' },
                { label: 'Hair Care', href: 'products.html?cat=haircare' },
                { label: 'Accessories', href: 'products.html?cat=accessories' },
            ],
        },
        {
            heading: 'Company',
            links: [
                { label: 'Our Story', href: 'about.html' },
                { label: 'Reviews', href: 'index.html#reviews' },
                { label: 'Contact Us', href: 'mailto:hello@amhairandbeauty.com' },
            ],
        },
        {
            heading: 'Help',
            links: [
                { label: 'Shopping Cart', href: 'cart.html' },
                { label: 'Sign In', href: AM_CONFIG.authUrl },
                { label: 'Online Shop', href: AM_CONFIG.shopUrl },
            ],
        },
    ],
};

// Expose globally
window.AM_CONFIG   = AM_CONFIG;
window.AM_PRODUCTS = AM_PRODUCTS;
window.AM_CATEGORIES = AM_CATEGORIES;
window.AM_ABOUT    = AM_ABOUT;
window.AM_NAV      = AM_NAV;
window.AM_FOOTER   = AM_FOOTER;

console.log('Data.js loaded✅');
