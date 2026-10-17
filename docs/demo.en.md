# Demo Walkthrough: Customer, Merchant, and Admin

[简体中文](demo.md) | **English**

Allow 5–8 minutes to demonstrate the flow from customer ordering to merchant fulfillment and platform management. Keep the three applications open in separate tabs to show how the same order appears to each role. The application interface is currently in Chinese; relevant button labels are included below.

## Preparation

Follow the [Quick Start](../README.en.md#quick-start) to run MySQL and all four services, then open:

- Customer app: `http://localhost:3000`
- Merchant app: `http://localhost:3001`
- Admin app: `http://localhost:3002`

Use the browser's mobile-device mode for the customer app if desired. The merchant and admin apps work best in wider windows. Demo merchant login codes are `HI888`, `COOL99`, and `SEA666`, all with the demo password `demo-merchant-123`. Log in to the admin app using the credentials configured in `.env.local`.

Start in the merchant app and check that the target store is open and its products are not sold out. The interface respects opening hours. If the demo takes place outside those hours, adjust the local demo data in the store settings.

## 1. Customer: Open a Stall's Menu

1. Enter a stall code, such as `HI888`, on the homepage to open its store.
2. Browse menu categories, product cards, and store details. Select a product with configurable options.
3. Change the portion size or add-ons, observe the price changes, and add the item to the cart.
4. Return to the homepage, open another stall, and add another product. Show how the cart groups items by store.

This demonstrates an ordering entry point organized around physical stalls, together with product-option and cart interactions.

## 2. Customer: Create a Pickup Order

1. Open checkout and select “Store pickup / Dine-in” (`门店自提 / 堂食`).
2. Enter a phone number intended only for the local demo. Optionally add food-preference notes.
3. Submit the order and review the separate orders and pickup details generated for each merchant.
4. On the order payment screen, click “I have paid” (`我已支付`) to enter the state awaiting merchant confirmation.

No real transfer is required for the demo database. This button only advances the demo order status and does not establish that funds have been received. If the merchant has no payment QR code configured, the page displays a notice; the order-state and merchant-processing flow can still be demonstrated.

Coupons are a prototype feature; leave them unselected during the main walkthrough. Beach delivery is not available yet. Its notice and delivery-interest entry point can be shown, but should not be presented as a completed delivery feature.

## 3. Merchant: Confirm Payment, Prepare the Order, and Confirm Pickup

1. Log in to the stall that received the order and open order management.
2. Find the order awaiting confirmation and review its products, options, notes, and total.
3. Click “Confirm payment receipt” (`确认收款`) to move the order into preparation.
4. Click “Preparation complete, notify for pickup” (`制作完成，通知取餐`). The customer app now shows the order as ready for pickup.
5. In the order details, click “Confirm pickup” (`核销订单`) and confirm to complete the order. QR-code pickup confirmation can also be demonstrated if a camera is available.
6. Return to the customer app to view the completed status, then show the merchant's business statistics.

Orders refresh through HTTP polling, so changes may take a few seconds to appear. If the cart contains items from multiple merchants, log in to each merchant separately to process its orders.

## 4. Merchant and Admin: Show How Data Is Maintained

In the merchant app, demonstrate editing a product name or price, marking an option as sold out, and changing the store's opening status. Refresh the customer app to show the corresponding changes.

In the admin app, show the merchant list, platform statistics, and settings. Create a demo merchant and use the returned stall code to log in to the merchant app. Alternatively, toggle a store-information display setting and refresh the customer app to verify the change.

## Optional Demonstrations

| Feature | Requirements and notes |
| --- | --- |
| Image and payment-evidence upload | Configure `RAINYUN_*`; use demo assets rather than real payment evidence |
| AI island tips | Configure `GEMINI_API_KEY`; generated content depends on network and service availability |
| QR-code pickup confirmation | Allow camera access; localhost can be used locally, while remote access generally requires HTTPS |
| Store-entry QR code | Generate it in the admin app; the QR-code base URL must point to a customer-app address accessible to the scanning device |

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Homepage fails to load | Check that the API health endpoint is accessible, MySQL is ready, and the connection settings in `api/.env.local` are correct |
| Login credentials differ from the examples | Seeds are only created for empty tables; an existing database retains its previous accounts |
| A product cannot be ordered | Check opening hours, the store's open/closed setting, sold-out flags, and remaining stock |
| Images or fonts do not appear | Some assets come from external services and require internet access; see [Third-Party Assets and External Services](third-party-assets.en.md) |
| Upload reports missing OSS configuration | Object storage is not configured; the basic ordering demo can run without uploads |
| Customer orders are not visible in another browser | The customer identifier is stored in the current browser; account synchronization across devices is not implemented |

For a recording or screenshots, prioritize the customer homepage, product options, order progress, merchant order workspace, and admin merchant list. Present the included merchants, images, and statistics as demo content.
