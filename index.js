    // Show product details
    function showProduct(productId) {
        const products = document.querySelectorAll('.product-detail');
        products.forEach(p => p.classList.remove('show'));
        const product = document.getElementById(productId);
        product.classList.add('show');
        product.scrollIntoView({ behavior: 'smooth' });
    }

    // Show more products
    function showProducts() {
        document.getElementById('more-products').style.display = 'block';
        document.getElementById('button').style.display = 'none';
    }

    // Slideshow
    const slides = document.querySelectorAll('.slideshow img');
    let current = 0;
    function showSlide(index) {
        slides.forEach((img, i) => img.classList.remove('active'));
        slides[index].classList.add('active');
    }
    function nextSlide() {
        current = (current + 1) % slides.length;
        showSlide(current);
    }
    showSlide(current);
    setInterval(nextSlide, 4000);

    // Scroll reveal
    const scrollTexts = document.querySelectorAll('.scroll-text');
    function revealOnScroll() {
        const triggerBottom = window.innerHeight * 0.85;
        scrollTexts.forEach(el => {
            const top = el.getBoundingClientRect().top;
            if (top < triggerBottom) {
                el.classList.add('show');
            } else {
                el.classList.remove('show');
            }
        });
    }
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // Basket functions
    function addToBasket(name, price, image) {
        let basket = JSON.parse(localStorage.getItem('basket')) || [];
        let existingItemIndex = basket.findIndex(item => item.name === name && item.price === price);
        if (existingItemIndex !== -1) {
            basket[existingItemIndex].quantity += 1;
        } else {
            basket.push({ name, price, image, quantity: 1 });
        }
        localStorage.setItem('basket', JSON.stringify(basket));
        showBasketMessage(name);
    }

    function showBasketMessage(productName) {
        const message = `You added 1 ${productName} to your basket.`;
        const messageBox = document.getElementById('basketMessage');
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.style.display = 'block';
            setTimeout(() => messageBox.style.display = 'none', 3000);
        }
    }