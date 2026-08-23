import { PrismaClient, Role, OrderStatus, PaymentStatus, FulfillmentStatus, OrderSource, CustomerSegment, MovementType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.subscriptionInvoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customerPrice.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.paymentAccount.deleteMany();
  await prisma.businessMember.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user (business owner)
  const user = await prisma.user.create({
    data: {
      clerkId: "user_demo_owner_001",
      email: "owner@demo.orderflow.com",
      firstName: "Adaeze",
      lastName: "Okonkwo",
      phone: "+2348012345678",
    },
  });

  // Create platform admin user
  const adminUser = await prisma.user.create({
    data: {
      clerkId: "user_platform_admin_001",
      email: "admin@orderflow.com",
      firstName: "System",
      lastName: "Admin",
    },
  });

  // Create demo business
  const business = await prisma.business.create({
    data: {
      name: "Adaeze's Fresh Mart",
      slug: "adaeze-fresh-mart",
      industry: "Food & Beverage",
      country: "NG",
      currency: "NGN",
      timezone: "Africa/Lagos",
      address: "15 Allen Avenue, Ikeja",
      city: "Lagos",
      state: "Lagos",
      phone: "+2348012345678",
      email: "info@adaezefreshmart.com",
      taxRate: 7.5,
      deliveryFee: 2000,
    },
  });

  // Create business membership
  await prisma.businessMember.create({
    data: {
      userId: user.id,
      businessId: business.id,
      role: Role.BUSINESS_OWNER,
      isOwner: true,
      acceptedAt: new Date(),
    },
  });

  // Create product categories
  const categories = await Promise.all([
    prisma.productCategory.create({ data: { businessId: business.id, name: "Beverages", sortOrder: 1 } }),
    prisma.productCategory.create({ data: { businessId: business.id, name: "Grains & Cereals", sortOrder: 2 } }),
    prisma.productCategory.create({ data: { businessId: business.id, name: "Cooking Essentials", sortOrder: 3 } }),
    prisma.productCategory.create({ data: { businessId: business.id, name: "Dairy & Eggs", sortOrder: 4 } }),
    prisma.productCategory.create({ data: { businessId: business.id, name: "Snacks", sortOrder: 5 } }),
  ]);

  // Create 20 products
  const productData = [
    { name: "Malta Guinness 50cl", slug: "malta-guinness-50cl", sku: "MGU-50CL", price: 2500, costPrice: 1800, unit: "carton", aliases: ["malt", "malta", "guinness", "guiness"], categoryId: categories[0].id },
    { name: "Malta Guinness 33cl", slug: "malta-guinness-33cl", sku: "MGU-33CL", price: 1800, costPrice: 1200, unit: "carton", aliases: ["small malt"], categoryId: categories[0].id },
    { name: "Coca-Cola 50cl", slug: "coca-cola-50cl", sku: "CCL-50CL", price: 2200, costPrice: 1500, unit: "carton", aliases: ["coke", "cola", "coca cola"], categoryId: categories[0].id },
    { name: "Fanta 50cl", slug: "fanta-50cl", sku: "FNT-50CL", price: 2200, costPrice: 1500, unit: "carton", aliases: ["fanta"], categoryId: categories[0].id },
    { name: "Premium Rice 50kg", slug: "premium-rice-50kg", sku: "RCE-50KG", price: 95000, costPrice: 78000, unit: "bag", aliases: ["rice", "ariba", "ofada"], categoryId: categories[1].id },
    { name: "Local Rice 50kg", slug: "local-rice-50kg", sku: "LRCE-50KG", price: 65000, costPrice: 52000, unit: "bag", aliases: ["local rice", "本土米"], categoryId: categories[1].id },
    { name: "Garri 50kg", slug: "garri-50kg", sku: "GRR-50KG", price: 35000, costPrice: 28000, unit: "bag", aliases: ["garri", "gari", "cassava"], categoryId: categories[1].id },
    { name: "Semolina 50kg", slug: "semolina-50kg", sku: "SML-50KG", price: 42000, costPrice: 34000, unit: "bag", aliases: ["semolina", "semovita"], categoryId: categories[1].id },
    { name: "Vegetable Oil 20L", slug: "vegetable-oil-20l", sku: "VOIL-20L", price: 48000, costPrice: 38000, unit: "keg", aliases: ["oil", "vegetable oil", "cooking oil"], categoryId: categories[2].id },
    { name: "Palm Oil 20L", slug: "palm-oil-20l", sku: "POIL-20L", price: 52000, costPrice: 42000, unit: "keg", aliases: ["palm oil", "red oil"], categoryId: categories[2].id },
    { name: "Tomato Paste 400g", slug: "tomato-paste-400g", sku: "TMP-400G", price: 1200, costPrice: 700, unit: "tin", aliases: ["tomato", "tomatoe", "paste"], categoryId: categories[2].id },
    { name: "Indomie Noodles 70g", slug: "indomie-noodles-70g", sku: "IND-70G", price: 200, costPrice: 130, unit: "pack", aliases: ["indomie", "noodles", "instant noodles"], categoryId: categories[2].id },
    { name: "Indomie Noodles Carton (40 packs)", slug: "indomie-carton", sku: "IND-CTN", price: 7500, costPrice: 5800, unit: "carton", aliases: ["indomie carton", "noodles carton"], categoryId: categories[2].id },
    { name: "Milk Powder 900g", slug: "milk-powder-900g", sku: "MLK-900G", price: 5500, costPrice: 4200, unit: "tin", aliases: ["milk", "powdered milk", "peak milk"], categoryId: categories[3].id },
    { name: "Eggs (crate of 30)", slug: "eggs-crate-30", sku: "EGG-CRT", price: 4500, costPrice: 3600, unit: "crate", aliases: ["eggs", "egg", "crate of eggs"], categoryId: categories[3].id },
    { name: "Dano Milk 50cl", slug: "dano-milk-50cl", sku: "DNO-50CL", price: 800, costPrice: 550, unit: "pack", aliases: ["dano", "dano milk"], categoryId: categories[3].id },
    { name: "Chin Chin 1kg", slug: "chin-chin-1kg", sku: "CHC-1KG", price: 3500, costPrice: 2200, unit: "pack", aliases: ["chin chin", "chinchin"], categoryId: categories[4].id },
    { name: "Plantain Chips 500g", slug: "plantain-chips-500g", sku: "PLC-500G", price: 2800, costPrice: 1800, unit: "pack", aliases: ["plantain chips", "kelewele chips"], categoryId: categories[4].id },
    { name: "Biscuit Assorted 1kg", slug: "biscuit-assorted-1kg", sku: "BSC-1KG", price: 4200, costPrice: 3100, unit: "pack", aliases: ["biscuit", "biscuits", "cookies"], categoryId: categories[4].id },
    { name: "Table Water 75cl (pack of 12)", slug: "table-water-75cl", sku: "WTR-75CL", price: 2000, costPrice: 1400, unit: "pack", aliases: ["water", "bottled water", "pure water"], categoryId: categories[0].id },
  ];

  const products = await Promise.all(
    productData.map((p) =>
      prisma.product.create({
        data: {
          businessId: business.id,
          ...p,
          isActive: true,
        },
      })
    )
  );

  // Create inventory for each product
  const inventoryData = products.map((p) => ({
    productId: p.id,
    businessId: business.id,
    stockOnHand: Math.floor(Math.random() * 500) + 50,
    reservedStock: Math.floor(Math.random() * 20),
    unit: p.unit,
    lowStockThreshold: 20,
  }));

  const inventories = await Promise.all(
    inventoryData.map((inv) => prisma.inventory.create({ data: inv }))
  );

  // Create inventory movements
  for (const inv of inventories) {
    await prisma.inventoryMovement.create({
      data: {
        inventoryId: inv.id,
        type: MovementType.IN,
        quantity: inv.stockOnHand,
        notes: "Initial stock",
      },
    });
  }

  // Create 20 customers
  const customerData = [
    { name: "Chidinma Eze", phone: "+2348023456789", email: "chidinma@email.com", segment: CustomerSegment.VIP },
    { name: "Emeka Nwosu", phone: "+2348034567890", email: "emeka@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Fatima Bello", phone: "+2348045678901", email: "fatima@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Oluwaseun Adeyemi", phone: "+2348056789012", email: "seun@email.com", segment: CustomerSegment.NEW },
    { name: "Amina Mohammed", phone: "+2348067890123", email: "amina@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Tunde Bakare", phone: "+2348078901234", email: "tunde@email.com", segment: CustomerSegment.HIGH_VALUE },
    { name: "Ngozi Obi", phone: "+2348089012345", email: "ngozi@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Ibrahim Suleiman", phone: "+2348090123456", email: "ibrahim@email.com", segment: CustomerSegment.NEW },
    { name: "Funke Adekunle", phone: "+2348101234567", email: "funke@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Yusuf Abdullahi", phone: "+2348112345678", email: "yusuf@email.com", segment: CustomerSegment.INACTIVE },
    { name: "Blessing Okoro", phone: "+2348123456789", email: "blessing@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Chukwuemeka Igwe", phone: "+2348134567890", email: "chukwu@email.com", segment: CustomerSegment.VIP },
    { name: "Halima Abubakar", phone: "+2348145678901", email: "halima@email.com", segment: CustomerSegment.NEW },
    { name: "Adewale Fashola", phone: "+2348156789012", email: "adewale@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Grace Okafor", phone: "+2348167890123", email: "grace@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Musa Isa", phone: "+2348178901234", email: "musa@email.com", segment: CustomerSegment.OVERDUE },
    { name: "Zainab Bello", phone: "+2348189012345", email: "zainab@email.com", segment: CustomerSegment.NEW },
    { name: "Kunle Ajayi", phone: "+2348190123456", email: "kunle@email.com", segment: CustomerSegment.HIGH_VALUE },
    { name: "Chioma Nnamdi", phone: "+2348201234567", email: "chioma@email.com", segment: CustomerSegment.ACTIVE },
    { name: "Sani Garba", phone: "+2348212345678", email: "sani@email.com", segment: CustomerSegment.NEW },
  ];

  const customers = await Promise.all(
    customerData.map((c) =>
      prisma.customer.create({
        data: {
          businessId: business.id,
          ...c,
          address: "123 Lagos Street, Lagos",
        },
      })
    )
  );

  // Create 30 orders with various statuses
  const orderStatuses = [
    OrderStatus.DRAFT,
    OrderStatus.PENDING_CONFIRMATION,
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.READY_FOR_FULFILLMENT,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ];

  const paymentStatuses = [
    PaymentStatus.UNPAID,
    PaymentStatus.PAID,
    PaymentStatus.REFUNDED,
    PaymentStatus.FAILED,
  ];

  const fulfillmentStatuses = [
    FulfillmentStatus.PENDING,
    FulfillmentStatus.PROCESSING,
    FulfillmentStatus.READY,
    FulfillmentStatus.SHIPPED,
    FulfillmentStatus.DELIVERED,
  ];

  const orders = [];
  for (let i = 0; i < 30; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const fulfillmentStatus = fulfillmentStatuses[Math.floor(Math.random() * fulfillmentStatuses.length)];
    const source = [OrderSource.WHATSAPP, OrderSource.WEB, OrderSource.API, OrderSource.PHONE][Math.floor(Math.random() * 4)];

    // Pick 1-4 random products
    const numItems = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      if (!selectedProducts.find((p) => p.id === product.id)) {
        selectedProducts.push(product);
      }
    }

    const orderItems = selectedProducts.map((product) => ({
      productId: product.id,
      quantity: Math.floor(Math.random() * 20) + 1,
      unitPrice: product.price,
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const taxAmount = subtotal * 0.075;
    const deliveryFee = Math.random() > 0.3 ? 2000 : 0;
    const totalAmount = subtotal + taxAmount + deliveryFee;

    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        orderNumber: `ORD-${String(i + 1).padStart(4, "0")}`,
        source,
        status: orderStatus,
        paymentStatus,
        fulfillmentStatus,
        subtotal,
        taxAmount,
        deliveryFee,
        totalAmount,
        notes: `Order from ${customer.name}`,
        createdAt,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: Number(item.unitPrice) * item.quantity,
          })),
        },
      },
    });

    orders.push(order);
  }

  // Update customer stats
  for (const customer of customers) {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const totalSpend = customerOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: customerOrders.length,
        totalSpend,
        lastOrderAt: customerOrders.length > 0 ? customerOrders[0].createdAt : null,
      },
    });
  }

  // Create conversations
  for (let i = 0; i < 10; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        status: "ACTIVE",
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          direction: "INBOUND",
          content: `Hi, I need some items delivered.`,
          messageType: "TEXT",
        },
        {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          content: `Hello ${customer.name}! What would you like to order?`,
          messageType: "TEXT",
        },
        {
          conversationId: conversation.id,
          direction: "INBOUND",
          content: `I need 10 malt and 5 bags of rice.`,
          messageType: "TEXT",
        },
      ],
    });
  }

  // Create automation rules
  await prisma.automationRule.createMany({
    data: [
      {
        businessId: business.id,
        name: "Order Confirmation",
        description: "Send WhatsApp confirmation when order is confirmed",
        trigger: "ORDER_CREATED",
        conditions: JSON.stringify([{ field: "status", operator: "eq", value: "PENDING_CONFIRMATION" }]),
        actions: JSON.stringify([{ type: "SEND_WHATSAPP", template: "order_confirmation" }]),
      },
      {
        businessId: business.id,
        name: "Payment Received",
        description: "Notify when payment is received",
        trigger: "PAYMENT_RECEIVED",
        conditions: JSON.stringify([{ field: "paymentStatus", operator: "eq", value: "PAID" }]),
        actions: JSON.stringify([
          { type: "SEND_WHATSAPP", template: "payment_received" },
          { type: "NOTIFY_STAFF", message: "Payment received for order" },
        ]),
      },
      {
        businessId: business.id,
        name: "Low Stock Alert",
        description: "Alert when inventory is low",
        trigger: "LOW_INVENTORY",
        conditions: JSON.stringify([{ field: "stockOnHand", operator: "lte", value: 20 }]),
        actions: JSON.stringify([{ type: "NOTIFY_STAFF", message: "Low stock alert" }]),
      },
    ],
  });

  // Create a payment account
  await prisma.paymentAccount.create({
    data: {
      businessId: business.id,
      provider: "PAYSTACK",
      reference: "psk_live_demo",
      config: JSON.stringify({ publicKey: "pk_test_demo" }),
    },
  });

  // Create integration
  await prisma.integration.create({
    data: {
      businessId: business.id,
      type: "WHATSAPP",
      config: JSON.stringify({ phoneNumberId: "demo_number_id" }),
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`   - 1 business owner user`);
  console.log(`   - 1 business`);
  console.log(`   - ${categories.length} product categories`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${customers.length} customers`);
  console.log(`   - 30 orders`);
  console.log(`   - 10 conversations`);
  console.log(`   - 3 automation rules`);
  console.log(`   - 1 payment account`);
  console.log(`   - 1 WhatsApp integration`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
