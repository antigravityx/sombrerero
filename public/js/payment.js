/**
 * VerixRichon Payment Helper
 * Frontend integration with Stripe payment service
 */

const PAYMENT_API_BASE = '/api/payment';

/**
 * Crea una sesión de pago y redirige al checkout de Stripe
 * @param {Array} cartItems - Items del carrito [{title, description, unit_price, quantity, currency}]
 * @param {Object} options - Opciones adicionales {return_url, metadata}
 */
async function createPaymentAndRedirect(cartItems, options = {}) {
    try {
        const response = await fetch(`${PAYMENT_API_BASE}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cartItems,
                return_url: options.return_url || window.location.href,
                metadata: options.metadata || {}
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear el pago');
        }

        const data = await response.json();

        if (data.checkout_url) {
            // Redirigir a Stripe Checkout
            window.location.href = data.checkout_url;
        } else {
            console.error('No se recibió URL de checkout', data);
            throw new Error('No se pudo crear la sesión de pago');
        }
    } catch (err) {
        console.error('Error en createPaymentAndRedirect:', err);
        alert(`Error al procesar el pago: ${err.message}`);
    }
}

/**
 * Obtiene los items del carrito desde el DOM
 * (puedes personalizar esta función según tu estructura HTML)
 */
function getCartItems() {
    // Ejemplo básico - adaptar según tu implementación
    const cartItems = [];
    const productElements = document.querySelectorAll('[data-product-item]');

    productElements.forEach(element => {
        const title = element.querySelector('[data-product-title]')?.textContent || 'Producto';
        const priceText = element.querySelector('[data-product-price]')?.textContent || '0';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        cartItems.push({
            title: title,
            description: element.querySelector('[data-product-description]')?.textContent || '',
            unit_price: price,
            quantity: 1,
            currency: 'usd' // Cambiar según tu moneda
        });
    });

    return cartItems;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Buscar botón de cart (o cualquier botón de pago)
    const cartButton = document.querySelector('.cart, #cart-button, [data-cart-button]');

    if (cartButton) {
        cartButton.addEventListener('click', async (e) => {
            e.preventDefault();

            // Obtener items del carrito
            const items = getCartItems();

            if (items.length === 0) {
                alert('El carrito está vacío');
                return;
            }

            // Crear sesión de pago
            await createPaymentAndRedirect(items, {
                metadata: {
                    source: 'verixrichon_libro',
                    timestamp: new Date().toISOString()
                }
            });
        });
    }
});

// Exportar para uso global
window.VerixPayment = {
    createPaymentAndRedirect,
    getCartItems
};
