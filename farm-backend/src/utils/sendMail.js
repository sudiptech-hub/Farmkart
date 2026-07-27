const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOrderMail = async ({
  sellerEmail,
  sellerName,
  buyer,
  products,
  paymentMethod,
}) => {
  let rows = "";
  let grandTotal = 0;

  products.forEach((item) => {
    const total = item.quantity * item.price;

    grandTotal += total;

    rows += `
      <tr>
        <td>${item.title}</td>
        <td>${item.quantity} kg</td>
        <td>₹${item.price}</td>
        <td>₹${total.toFixed(2)}</td>
      </tr>
    `;
  });

  const html = `
  <div style="font-family:Arial;padding:20px">

      <h2 style="color:#16a34a">
        🌾 FarmKart
      </h2>

      <h3>Hello ${sellerName},</h3>

      <p>You have received a new order.</p>

      <hr>

      <h3>Buyer Information</h3>

      <p><b>Name :</b> ${buyer.name}</p>

      <p><b>Name :</b> ${buyer.name}</p>

      <p><b>Email :</b> ${buyer.email}</p>

      <p><b>Mobile :</b> ${buyer.mobile}</p>

      <p><b>Shipping Address :</b></p>

      <p>
        ${buyer.address}<br>
        ${buyer.district}<br>
        ${buyer.state} - ${buyer.pin}
      </p>

      <hr>

      <h3>Ordered Products</h3>

      <table
      border="1"
      cellpadding="10"
      cellspacing="0"
      style="border-collapse:collapse;width:100%">

      <thead style="background:#16a34a;color:white">

      <tr>

      <th>Product</th>

      <th>Quantity</th>

      <th>Price</th>

      <th>Total</th>

      </tr>

      </thead>

      <tbody>

      ${rows}

      </tbody>

      </table>

      <br>

      <h3>

      Grand Total : ₹${grandTotal.toFixed(2)}

      </h3>

      <p>

      Payment Method :

      <b>${paymentMethod}</b>

      </p>

      <p><b>Order Date :</b> ${new Date().toLocaleString()}</p>

      <hr>

      <h3 style="color:#16a34a">

      Please prepare the shipment.

      </h3>

      <hr>

<p>
This email was generated automatically by FarmKart.
Please do not reply.
</p>

<p>
FarmKart Marketplace
</p>

  </div>
  `;

  await transporter.sendMail({
    from: `"FarmKart" <${process.env.EMAIL_USER}>`,
    to: sellerEmail,
    subject: `🌾 New FarmKart Order - ${buyer.name}`,
    html,
  });
};

module.exports = sendOrderMail;
