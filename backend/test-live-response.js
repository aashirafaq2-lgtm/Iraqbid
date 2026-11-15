
import axios from 'axios';

async function testLiveApi() {
  const url = 'http://72.62.50.86';
  const headers = { 'Host': 'api.mazaadati.com' };

  try {
    console.log('--- Testing /api/products ---');
    const response = await axios.get(`${url}/api/products`, { headers });
    const products = response.data.data;

    console.log('Total Count:', response.data.pagination.total);
    console.log('Returned Count:', products.length);

    const sources = products.reduce((acc, p) => {
      acc[p.productSource] = (acc[p.productSource] || 0) + 1;
      return acc;
    }, {});

    console.log('Sources breakdown:', sources);

    if (products.length > 0) {
      console.log('Sample Product:', {
        id: products[0].id,
        title: products[0].title,
        status: products[0].status,
        sellerId: products[0].sellerId,
        productSource: products[0].productSource
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLiveApi();
