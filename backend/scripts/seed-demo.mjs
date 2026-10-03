// One-off demo data seeder — hits the running dev API so all business logic
// (password hashing, slug/invoice numbering, order totals) runs for real.
// Usage: node scripts/seed-demo.mjs   (requires `npm run dev` running)

const API = process.env.API_URL ?? 'http://localhost:4000';

async function call(path, options = {}, token) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function daysFromNow(n, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function yearsAgoSameDay(years, monthOffset = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() + monthOffset);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log('Registering Sunita\'s Cake Studio...');
  const email = 'sunita@bakeops.demo';
  const password = 'password123';

  let auth;
  try {
    auth = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        businessName: "Sunita's Cake Studio",
        category: 'Bakery',
        ownerName: 'Sunita Sharma',
        email,
        password,
        phone: '9822041556',
      }),
    });
  } catch (err) {
    if (String(err).includes('409')) {
      console.log('Business already exists, logging in instead...');
      auth = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    } else {
      throw err;
    }
  }

  const token = auth.token;
  console.log('Business:', auth.business.name, auth.business.slug);

  await call(
    '/api/business/me',
    { method: 'PATCH', body: JSON.stringify({ address: 'Aundh, Pune' }) },
    token
  );

  const customers = {};
  async function makeCustomer(name, phone, occasions = []) {
    const { customer } = await call('/api/customers', { method: 'POST', body: JSON.stringify({ name, phone }) }, token);
    for (const occ of occasions) {
      await call(`/api/customers/${customer.id}/occasions`, { method: 'POST', body: JSON.stringify(occ) }, token);
    }
    customers[name] = customer.id;
    return customer.id;
  }

  console.log('Creating customers...');
  const today = new Date();
  const in5 = new Date(today.getTime() + 5 * 86400000);
  const in10 = new Date(today.getTime() + 10 * 86400000);

  await makeCustomer('Sharma ji', '9990040001', [{ label: 'Birthday', month: in5.getMonth() + 1, day: in5.getDate() }]);
  await makeCustomer('Mrs. Kulkarni', '9004022187', [{ label: 'Anniversary', month: in10.getMonth() + 1, day: in10.getDate() }]);
  await makeCustomer('Aditi Rane', '9822300112');
  await makeCustomer('Deshpande family', '9765400223', [{ label: 'Ganpati', month: today.getMonth() + 1, day: Math.min(28, today.getDate() + 8) }]);
  await makeCustomer('Nikhil Joshi', '9812345678');
  await makeCustomer('Faiz Ahmed', '9900112233');

  async function makeOrder(customerName, items, opts = {}) {
    const { order } = await call(
      '/api/orders',
      {
        method: 'POST',
        body: JSON.stringify({
          customerId: customers[customerName],
          items,
          occasionTag: opts.occasionTag,
          deliveryDate: opts.deliveryDate,
          orderDate: opts.orderDate,
          advancePaid: opts.advancePaid ?? 0,
          notes: opts.notes,
        }),
      },
      token
    );
    return order;
  }

  async function advance(orderId, status) {
    await call(`/api/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
  }

  console.log('Creating order history (for repeat-customer streaks)...');
  // Sharma ji: birthday order last year and the year before -> "2 years running"
  const sharmaLastYear = await makeOrder(
    'Sharma ji',
    [{ description: '1.5kg chocolate truffle cake, eggless', quantity: 1, unitPrice: 1850 }],
    { occasionTag: 'Birthday', orderDate: yearsAgoSameDay(1) }
  );
  await advance(sharmaLastYear.id, 'CONFIRMED');
  await advance(sharmaLastYear.id, 'IN_PROGRESS');
  await advance(sharmaLastYear.id, 'READY');
  await advance(sharmaLastYear.id, 'DELIVERED');

  const sharmaTwoYearsAgo = await makeOrder(
    'Sharma ji',
    [{ description: '1kg chocolate truffle cake', quantity: 1, unitPrice: 1600 }],
    { occasionTag: 'Birthday', orderDate: yearsAgoSameDay(2) }
  );
  await advance(sharmaTwoYearsAgo.id, 'CONFIRMED');
  await advance(sharmaTwoYearsAgo.id, 'IN_PROGRESS');
  await advance(sharmaTwoYearsAgo.id, 'READY');
  await advance(sharmaTwoYearsAgo.id, 'DELIVERED');

  // Deshpande family: Ganpati orders last two years
  const deshLastYear = await makeOrder(
    'Deshpande family',
    [{ description: '3kg pineapple cake, two tier', quantity: 1, unitPrice: 2400 }],
    { occasionTag: 'Ganpati', orderDate: yearsAgoSameDay(1) }
  );
  await advance(deshLastYear.id, 'CONFIRMED');
  await advance(deshLastYear.id, 'IN_PROGRESS');
  await advance(deshLastYear.id, 'READY');
  await advance(deshLastYear.id, 'DELIVERED');

  console.log('Creating today\'s kitchen orders...');
  const kulkarniToday = await makeOrder(
    'Mrs. Kulkarni',
    [{ description: '1kg Black Forest', quantity: 1, unitPrice: 1100 }],
    { occasionTag: 'Birthday', deliveryDate: daysFromNow(0, 16, 0) }
  );
  await advance(kulkarniToday.id, 'CONFIRMED');
  await advance(kulkarniToday.id, 'IN_PROGRESS');

  const aditiToday = await makeOrder(
    'Aditi Rane',
    [{ description: '2kg Butterscotch', quantity: 1, unitPrice: 2400 }],
    { occasionTag: 'Office party', deliveryDate: daysFromNow(0, 19, 0), advancePaid: 500 }
  );
  await advance(aditiToday.id, 'CONFIRMED');
  await advance(aditiToday.id, 'IN_PROGRESS');
  await advance(aditiToday.id, 'READY');

  console.log('Creating upcoming + pipeline orders...');
  const faizInquiry = await makeOrder(
    'Faiz Ahmed',
    [{ description: 'Half kg Red Velvet jar cakes', quantity: 6, unitPrice: 300 }],
    { deliveryDate: daysFromNow(4, 18, 0) }
  );
  void faizInquiry;

  const kulkarniUpcoming = await makeOrder(
    'Mrs. Kulkarni',
    [{ description: '1.5kg Anniversary cake', quantity: 1, unitPrice: 2100 }],
    { occasionTag: 'Anniversary', deliveryDate: daysFromNow(10, 17, 0) }
  );
  await advance(kulkarniUpcoming.id, 'CONFIRMED');

  console.log('Creating invoices + payments (Money screen data)...');
  // Nikhil Joshi: overdue unpaid invoice
  const nikhilOrder = await makeOrder(
    'Nikhil Joshi',
    [{ description: '1kg Vanilla cake', quantity: 1, unitPrice: 800 }],
    { deliveryDate: daysFromNow(-12, 12, 0) }
  );
  await advance(nikhilOrder.id, 'CONFIRMED');
  await advance(nikhilOrder.id, 'IN_PROGRESS');
  await advance(nikhilOrder.id, 'READY');
  await advance(nikhilOrder.id, 'DELIVERED');
  await call(`/api/orders/${nikhilOrder.id}/invoice`, { method: 'POST' }, token);

  // Aditi Rane: due today, unpaid (partial advance already on the order)
  await call(`/api/orders/${aditiToday.id}/invoice`, { method: 'POST' }, token);

  // Deshpande family: fully paid invoice (received this week)
  const { invoice: deshInvoice } = await call(`/api/orders/${deshLastYear.id}/invoice`, { method: 'POST' }, token);
  await call(`/api/invoices/${deshInvoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amount: 2400, method: 'UPI' }) }, token);

  // Sharma ji (last year's order): partially paid
  const { invoice: sharmaInvoice } = await call(`/api/orders/${sharmaLastYear.id}/invoice`, { method: 'POST' }, token);
  await call(`/api/invoices/${sharmaInvoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amount: 500, method: 'cash' }) }, token);

  console.log('\nDone! Log in with:');
  console.log('  email:   ', email);
  console.log('  password:', password);
}

main().catch((err) => {
  console.error('SEED FAILED:', err.message);
  process.exit(1);
});
