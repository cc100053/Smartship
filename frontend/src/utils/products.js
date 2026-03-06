export const getProductSource = (product) => product?.source || 'reference';

export const getProductKey = (product) => `${getProductSource(product)}:${product.id}`;
