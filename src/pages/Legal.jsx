import { useParams } from "react-router-dom";
import Seo from "@/components/site/Seo";

const LEGAL = {
  "privacy-policy": {
    title: "Privacy Policy",
    updated: "September 2026",
    sections: [
      { h: "Information We Collect", p: "We collect information you provide directly — such as your email address when you subscribe to our free resources or purchase an ebook. We also collect basic analytics data about how you use the site." },
      { h: "How We Use Your Information", p: "Your email is used to deliver free resources, send your ebook download link after purchase, and occasionally notify you of new content. We never sell your personal information to third parties." },
      { h: "Email Communications", p: "You can unsubscribe from our email list at any time using the unsubscribe link in every email we send." },
      { h: "Cookies", p: "We use minimal cookies to keep your shopping cart working and to understand basic site usage. We do not use invasive tracking." },
      { h: "Third-Party Services", p: "Ebook payments are processed by our payment provider. Physical merchandise is fulfilled by Spring. These providers have their own privacy policies governing the data they collect." },
      { h: "Your Rights", p: "You may request access to, correction of, or deletion of your personal data by contacting us at support@darknetwork.com." },
      { h: "Contact", p: "Questions about privacy? Email support@darknetwork.com." },
    ],
  },
  "terms": {
    title: "Terms & Conditions",
    updated: "September 2026",
    sections: [
      { h: "Acceptance of Terms", p: "By using the Dark Network website, you agree to these terms and conditions. If you do not agree, please do not use the site." },
      { h: "Content Use", p: "All Bible studies, videos, articles, and resources on this site are for personal, non-commercial use. You may not reproduce, redistribute, or republish our content without written permission." },
      { h: "Digital Products", p: "Ebooks are licensed to you for personal use. You may not share, resell, or distribute purchased ebooks. Download links are for your use only." },
      { h: "Physical Products", p: "Physical merchandise is sold and fulfilled by Spring. Their terms apply to the purchase, printing, and shipping of those products." },
      { h: "Intellectual Property", p: "All content on this site — including text, images, videos, and designs — is owned by or licensed to the Dark Network and protected by copyright law." },
      { h: "Limitation of Liability", p: "The Dark Network is an educational and media platform. Our content is provided for informational and inspirational purposes and is not a substitute for professional religious or historical guidance." },
      { h: "Changes to Terms", p: "We may update these terms from time to time. Continued use of the site after changes constitutes acceptance of the updated terms." },
    ],
  },
  "refund-policy": {
    title: "Refund Policy",
    updated: "September 2026",
    sections: [
      { h: "Digital Ebooks", p: "Because ebooks are digital goods delivered instantly and cannot be 'returned,' they are generally non-refundable once downloaded. If you experience a technical issue accessing your purchase, contact us at support@darknetwork.com and we will resolve it or issue a refund at our discretion." },
      { h: "Duplicate or Accidental Purchases", p: "If you accidentally purchase the same ebook twice, or made an error in your order, contact us within 14 days and we'll make it right." },
      { h: "Physical Merchandise", p: "Physical products are fulfilled by Spring. Refunds, exchanges, and returns for physical merchandise are handled directly by Spring according to their return policy. Visit your Spring order confirmation or contact their support for assistance." },
      { h: "How to Request a Refund", p: "Email support@darknetwork.com with your order number and details. We aim to respond within 2 business days." },
    ],
  },
  "digital-product-policy": {
    title: "Digital Product Policy",
    updated: "September 2026",
    sections: [
      { h: "What Is a Digital Product", p: "Digital products on the Dark Network include ebooks, downloadable study guides, reading plans, and any other content delivered electronically." },
      { h: "Delivery", p: "Digital products are delivered instantly. After a successful purchase, you'll see a download link on the confirmation page and receive one by email." },
      { h: "Download Limits", p: "Your download link is valid for the lifetime of the product. If your link expires or you lose access, contact us with your order number for a new one." },
      { h: "File Formats", p: "Ebooks are provided in PDF format unless otherwise noted. PDFs can be read on any device — phones, tablets, e-readers, and computers." },
      { h: "Usage License", p: "Your purchase grants a personal, non-transferable license to read and use the content. You may not share, resell, or distribute the file." },
      { h: "Technical Support", p: "If you have trouble downloading or opening your file, email support@darknetwork.com and we'll help you access your purchase." },
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    updated: "September 2026",
    sections: [
      { h: "Digital Products", p: "Digital ebooks and downloadable resources require no shipping. They are delivered instantly via download link." },
      { h: "Physical Merchandise", p: "All physical products — apparel, wall art, mugs, and gifts — are printed and shipped by Spring (formerly Teespring). Because items are made to order, production typically takes 2–7 business days before shipping." },
      { h: "Shipping Times", p: "After production, shipping times depend on your location and the shipping method selected at checkout on Spring. Standard shipping within the US typically takes 3–7 business days." },
      { h: "Shipping Costs", p: "Shipping costs are calculated and displayed at checkout on the Spring platform before you complete your purchase." },
      { h: "International Shipping", p: "Spring ships to many countries worldwide. Availability and delivery times vary by location. Check the Spring checkout for your country." },
      { h: "Order Issues", p: "For issues with a physical order — damage, delays, or incorrect items — contact Spring support directly using the information in your order confirmation email." },
    ],
  },
};

export default function Legal() {
  const { slug } = useParams();
  const doc = LEGAL[slug];

  if (!doc) {
    return (
      <div className="pt-32 text-center max-w-md mx-auto px-4">
        <h1 className="font-heading text-3xl font-bold mb-4">Page Not Found</h1>
        <a href="/" className="text-primary hover:underline">← Back home</a>
      </div>
    );
  }

  return (
    <>
      <Seo title={`${doc.title} — Dark Network`} description={doc.title} />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h1 className="font-heading text-3xl md:text-5xl font-bold">{doc.title}</h1>
            <p className="text-sm text-muted-foreground mt-3">Last updated: {doc.updated}</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="space-y-8">
            {doc.sections.map((s, i) => (
              <div key={i}>
                <h2 className="font-heading text-xl font-semibold mb-2 text-primary">{s.h}</h2>
                <p className="text-foreground/80 leading-relaxed">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}