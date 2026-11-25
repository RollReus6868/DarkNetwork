// The five legal pages (footer "Legal"). Each section: h (heading), p (paragraphs), list (bullets).
// Keep these true to how the site really works: who receives which data, how books are delivered,
// what happens to merch orders. Change SUPPORT_EMAIL in one place.
export const SUPPORT_EMAIL = "support@darknetworkofficial.uk";
export const SITE_NAME = "Dark Network";
export const SITE_URL = "darknetworkofficial.uk";
const UPDATED = "November 25, 2026";

export const LEGAL_PAGES = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "digital-product-policy", label: "Digital Product Policy" },
  { slug: "shipping-policy", label: "Shipping Policy" },
];

export const LEGAL = {
  "privacy-policy": {
    title: "Privacy Policy",
    updated: UPDATED,
    intro: `This policy explains what personal information ${SITE_NAME} ("we", "us") collects when you use ${SITE_URL} (the "site"), why we collect it, who we share it with, and the choices you have. We collect only what we need to run the site, deliver your purchases and answer you.`,
    sections: [
      {
        h: "Information You Give Us",
        list: [
          "Account: your email address, the name you choose and your password if you create an account. Passwords are stored securely by our sign-in provider; we never see them.",
          "Ebook purchases: your email address, the books you bought, the amount paid and the PayPal order number. Your card or bank details are entered on PayPal and never reach us.",
          "Merchandise orders: your name, shipping address, email address and phone number (needed by the carrier), the items ordered and tracking information.",
          "Email sign-ups: the email address you enter to receive free resources or news.",
          "Messages: what you write to us through the chat window or the contact form, with the name and email address you give us there.",
        ],
      },
      {
        h: "Information Collected Automatically",
        list: [
          "Our own visit statistics: a random visitor and visit identifier stored in your browser, the pages you view and for how long, the website or campaign that sent you, your country (provided by our hosting network), and cart and checkout steps. We do not store your IP address in these statistics.",
          "Google Analytics: we use Google Analytics to understand how visitors use the site. Google sets cookies and processes data such as your IP address, device and browser to produce reports for us. Learn more at policies.google.com/technologies/partner-sites, or opt out with the Google Analytics Opt-out Browser Add-on.",
        ],
      },
      {
        h: "How We Use Your Information",
        list: [
          "To process payments and deliver your ebooks and merchandise.",
          "To give you access to your library and order history in your account.",
          "To answer your messages and provide customer support.",
          "To send you the free resources or news you signed up for.",
          "To understand which pages and books are useful, fix problems and improve the site.",
          "To prevent fraud and abuse, and to meet legal and accounting obligations.",
        ],
        p: ["We do not sell your personal information, and we do not share it for targeted advertising."],
      },
      {
        h: "Who We Share It With",
        p: ["We share personal information only with the service providers that run parts of the site for us, and only what each needs:"],
        list: [
          "PayPal — processes payments, refunds and disputes.",
          "Printify and its print partners — make and ship merchandise orders (name, shipping address, email, phone number and items).",
          "Supabase — hosts our database, user accounts and files.",
          "Cloudflare — hosts and delivers the website.",
          "Google (Google Analytics) — visit statistics.",
          "YouTube — videos on the site are embedded from YouTube (privacy-enhanced mode) and load only when you press play; YouTube's own policy then applies.",
        ],
        p2: [
          "Donations are made through Ko-fi's own form (shown in a window on the site), and older merchandise listings marked \"Buy on Spring\" are sold on Spring; both follow their own privacy policies.",
          "We may also disclose information if required by law, or to protect our rights, our customers or the public.",
        ],
      },
      {
        h: "Cookies and Browser Storage",
        p: ["The site stores a few small items in your browser:"],
        list: [
          "Your shopping carts (ebooks and merchandise), so they are still there when you come back.",
          "The shipping details you last entered at checkout, to fill the form for you next time (only on your device).",
          "A key that lets the chat window show your earlier conversation.",
          "Your sign-in session, if you have an account.",
          "The random visitor and visit identifiers used by our visit statistics.",
          "Google Analytics cookies (names starting with _ga).",
        ],
        p2: ["You can clear these at any time in your browser settings, or browse in a private window. The site keeps working without them, but your cart and sign-in will not be remembered."],
      },
      {
        h: "How Long We Keep It",
        p: ["We keep purchase records for as long as needed to give you access to your books and to meet tax and accounting requirements. Account information is kept until you ask us to delete your account. Email sign-ups are kept until you unsubscribe. Chat and contact messages are kept as long as needed to help you. Visit statistics are kept in aggregate form to compare periods over time."],
      },
      {
        h: "Your Choices and Rights",
        p: [`You can ask us to access, correct, export or delete your personal information, or to stop sending you emails, by writing to ${SUPPORT_EMAIL}. Depending on where you live (for example the European Union, the United Kingdom or California), you may have additional rights under local law, including the right to object to or restrict certain uses and to complain to your data protection authority. We will answer within 30 days. We may keep records we are legally required to keep, such as purchase records.`],
      },
      {
        h: "Security",
        p: ["Connections to the site are encrypted (HTTPS), purchased files are stored privately and are only reachable through short-lived download links, and access to customer data is limited to the site's administrators. No system is perfectly secure, so please use a strong password and keep it to yourself."],
      },
      {
        h: "International Transfers",
        p: ["Our service providers may process your information in the United States and other countries. By using the site, you understand that your information may be processed outside your country, under the protections those providers offer."],
      },
      {
        h: "Children",
        p: [`The site is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child has given us personal information, contact ${SUPPORT_EMAIL} and we will delete it.`],
      },
      {
        h: "Changes to This Policy",
        p: ["We may update this policy when the site or the law changes. The date at the top shows the latest version."],
      },
      {
        h: "Contact",
        p: [`Questions about privacy? Email ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  terms: {
    title: "Terms & Conditions",
    updated: UPDATED,
    intro: `These terms apply to your use of ${SITE_URL} (the "site") and to everything you buy on it from ${SITE_NAME} ("we", "us"). By using the site or placing an order, you agree to them. If you do not agree, please do not use the site.`,
    sections: [
      {
        h: "About the Site",
        p: ["Dark Network is a Bible study and media platform. Our studies, videos, articles and books share historical, cultural and theological research and our interpretation of Scripture. They are offered for education and inspiration and are not a substitute for professional, pastoral, legal or medical advice."],
      },
      {
        h: "Your Account",
        p: ["You may browse and buy without an account. If you create one, give a valid email address, keep your password private and tell us if you think someone else has used your account. You are responsible for what happens under your account. We may suspend or close accounts used to break these terms, abuse the site or share purchased files."],
      },
      {
        h: "Orders, Prices and Payment",
        list: [
          "Prices are in US dollars. Taxes or fees charged by your bank or country, if any, are your responsibility.",
          "Payments are processed by PayPal. Your order is confirmed once PayPal confirms the payment.",
          "Merchandise shipping is calculated from your address and shown at checkout before you pay.",
          "We may correct obvious pricing or listing errors, and we may refuse or cancel an order affected by such an error, refunding any payment in full.",
          "We may change prices and products at any time; changes never affect orders already paid.",
        ],
      },
      {
        h: "Digital Products",
        p: ["Ebooks and other downloads are licensed to you, not sold. Your purchase gives you a personal, non-transferable, non-exclusive license to download, read and print the files for your own use. You may not share, upload, resell, distribute or publicly display the files, or remove any copyright notices. Delivery and access are described in our Digital Product Policy."],
      },
      {
        h: "Physical Products",
        p: ["Apparel and gifts are printed to order and shipped by our print-on-demand partner. Colors may look slightly different on screen than in print, and sizes follow the size chart on each product page. Shipping is described in our Shipping Policy, and returns in our Refund Policy. Listings marked \"Buy on Spring\" are sold and shipped by Spring under its own terms."],
      },
      {
        h: "Donations",
        p: ["Donations are voluntary gifts that support our work. They are processed by Ko-fi under its terms and do not buy any product or service."],
      },
      {
        h: "Intellectual Property",
        p: ["All content on the site — text, studies, books, videos, images, designs and logos — is owned by or licensed to Dark Network and protected by copyright and other laws. You may view it and share links to it. Short quotations for review, teaching or discussion are welcome with credit to Dark Network and a link to the site. Any other copying, republishing or commercial use needs our written permission. Scripture quotations remain under the terms of their respective translations."],
      },
      {
        h: "Acceptable Use",
        p: ["You agree not to:"],
        list: [
          "use the site for anything unlawful, fraudulent or harmful;",
          "send abusive, hateful, threatening or spam messages through the chat or contact form;",
          "try to get around payment or download protections, or access other people's accounts or data;",
          "copy the site's content in bulk, including by automated scraping;",
          "interfere with the site's security or operation.",
        ],
      },
      {
        h: "Messages You Send Us",
        p: ["When you send us a message, review or suggestion, you confirm it is your own and allow us to use it to answer you and improve the site. We will not publish your name or message without your permission."],
      },
      {
        h: "Other Websites",
        p: ["The site links to and embeds services run by others, such as YouTube, PayPal, Ko-fi, Printify and Spring. We are not responsible for their content, policies or availability."],
      },
      {
        h: "Disclaimer",
        p: ["We work to keep the site accurate and available, but it is provided \"as is\" and \"as available\". To the extent permitted by law, we do not guarantee that the site will always be available, error-free or free of harmful components, or that every statement in our content is complete or current."],
      },
      {
        h: "Limitation of Liability",
        p: ["To the extent permitted by law, Dark Network is not liable for indirect, incidental or consequential losses arising from your use of the site, and our total liability for any claim about a purchase is limited to the amount you paid for it. Nothing in these terms limits rights you have as a consumer that cannot be limited by contract under the law where you live."],
      },
      {
        h: "Changes to These Terms",
        p: ["We may update these terms from time to time. The date at the top shows the latest version. The terms in force when you placed an order apply to that order; continued use of the site after a change means you accept the updated terms."],
      },
      {
        h: "Contact",
        p: [`Questions about these terms? Email ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  "refund-policy": {
    title: "Refund Policy",
    updated: UPDATED,
    intro: "We want you to be happy with what you buy. This policy explains when we refund ebooks and merchandise, and how to ask.",
    sections: [
      {
        h: "Digital Ebooks",
        p: ["Ebooks are delivered instantly and cannot be returned, so purchases are final once the file has been made available to you. We will, however, refund or fix your order when:"],
        list: [
          "the file is damaged, incomplete or will not open and we cannot give you a working copy;",
          "you bought the same ebook twice, or bought a book by mistake, and you tell us within 14 days of purchase;",
          "you were charged but never received access to your book.",
        ],
        p2: ["Please contact us before opening a dispute with PayPal — we can usually solve the problem the same day."],
      },
      {
        h: "Physical Merchandise",
        p: ["Every item is printed to order just for you, so we cannot accept returns or exchanges for a change of mind or the wrong size. Please check the size chart on the product page before ordering."],
        p2: ["If your item arrives damaged, misprinted, defective or is not what you ordered, email us within 30 days of delivery with your order number and a photo of the problem. We will send a free replacement or a full refund. If your package is lost in transit, contact us and we will work with our print partner and the carrier to get it to you or refund you."],
      },
      {
        h: "Cancelling an Order",
        p: ["Merchandise orders go into production automatically as soon as payment is confirmed, so we usually cannot cancel or change them. If you made a mistake, contact us right away and we will do our best before production starts. Ebook orders are delivered instantly and cannot be cancelled."],
      },
      {
        h: "Listings Sold by Spring",
        p: ["Items bought through a \"Buy on Spring\" link are sold by Spring and follow Spring's return policy."],
      },
      {
        h: "How Refunds Are Paid",
        p: ["Approved refunds go back to your original payment through PayPal, usually within 5–10 business days depending on your bank. When an ebook is refunded, access to its download is removed."],
      },
      {
        h: "How to Request a Refund",
        p: [`Email ${SUPPORT_EMAIL} with your order number, the email used for the order and a short description (and a photo for damaged merchandise). We aim to reply within 2 business days.`],
      },
    ],
  },

  "digital-product-policy": {
    title: "Digital Product Policy",
    updated: UPDATED,
    intro: "Everything you need to know about how ebooks and other downloads are delivered, how long you can access them and what you may do with them.",
    sections: [
      {
        h: "What We Sell",
        p: ["Our digital products are ebooks: full versions, in-depth topic studies and shorter part-by-part editions. Each product page describes what is included. Free resources are downloadable without payment."],
      },
      {
        h: "Delivery",
        list: [
          "With an account: your books appear right away in your library under My Account, where you can download them at any time.",
          "Without an account: right after payment you are taken to a private download page. Its link is also included in your PayPal receipt — keep that email to find your books again.",
          "Bought as a guest? Open your private download page, create a free account or sign in, and those books are moved into your library.",
        ],
      },
      {
        h: "Access",
        p: [`You can download your books again whenever you need to, for as long as the site operates. Each download uses a secure link that works for a short time, so always start from your library or your private download page rather than saving the file link itself. If you lose access, email ${SUPPORT_EMAIL} with your order number or the email you used and we will restore it.`],
      },
      {
        h: "File Format",
        p: ["Ebooks are PDF files unless the product page says otherwise. PDFs open on phones, tablets, e-readers and computers with any PDF reader."],
      },
      {
        h: "Your License",
        p: ["Your purchase gives you a personal, non-transferable license to read and print the book for your own use. Please do not share, upload, resell or distribute the files — sales are what make new studies possible."],
      },
      {
        h: "Updates",
        p: ["We may correct or improve a book after release. Updated files replace the old ones in your library at no extra cost."],
      },
      {
        h: "Refunds",
        p: ["Digital purchases are final once delivered, except in the cases listed in our Refund Policy (technical problems, duplicate or mistaken purchases)."],
      },
      {
        h: "Technical Support",
        p: [`Trouble downloading or opening a file? Email ${SUPPORT_EMAIL} with your order number and we will help.`],
      },
    ],
  },

  "shipping-policy": {
    title: "Shipping Policy",
    updated: UPDATED,
    intro: "Ebooks are delivered instantly. Apparel and gifts are printed to order and shipped by our print-on-demand partner. Here is what to expect.",
    sections: [
      {
        h: "Digital Products",
        p: ["Ebooks and downloads need no shipping: they are available immediately after payment (see our Digital Product Policy)."],
      },
      {
        h: "Production Time",
        p: ["Each item is printed to order after your payment is confirmed. Production usually takes 2–5 business days, depending on the product."],
      },
      {
        h: "Delivery Time",
        list: [
          "United States: usually 3–8 business days after production.",
          "Other countries: usually 1–4 weeks after production, depending on the destination and customs.",
        ],
        p2: ["These are estimates from our print partner and carriers, not guarantees. Delays can happen around holidays or because of weather and customs."],
      },
      {
        h: "Shipping Costs",
        p: ["Shipping is calculated from your address and the items in your cart, and shown at checkout before you pay. Each additional item usually costs less to ship than the first."],
      },
      {
        h: "Where We Ship",
        p: ["We ship to the United States and the countries listed at checkout, including Canada, the United Kingdom, much of Europe, Australia, New Zealand, Japan, Singapore and several countries in Africa and the Caribbean. If your country is not listed, contact us."],
      },
      {
        h: "Customs, Duties and Taxes",
        p: ["Orders shipped outside the United States may be charged import duties or taxes by the destination country. These are not included in our prices or shipping and are paid by the buyer."],
      },
      {
        h: "Tracking",
        p: ["When your order ships, you receive an email with the tracking link, and your order page (linked after checkout and in My Account) shows its status and tracking number."],
      },
      {
        h: "Your Address",
        p: ["Please check your shipping address carefully. Orders go into production right after payment, so we cannot change the address once production has started. Packages returned because of an incorrect or incomplete address can be reshipped at the buyer's cost."],
      },
      {
        h: "Lost, Late or Damaged Packages",
        p: [`If your package has not arrived within the delivery times above, or arrives damaged, email ${SUPPORT_EMAIL} with your order number. See our Refund Policy for replacements and refunds. Listings marked "Buy on Spring" are shipped by Spring: contact Spring support for those.`],
      },
    ],
  },
};
