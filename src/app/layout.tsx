import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "CallAutomate – AI that answers, chats and takes orders for restaurants",
  description:
    "CallAutomate builds AI voice agents, WhatsApp and Meta chatbots and AI ordering websites for restaurants and takeaways, connected to Toast, Clover and Square.",
  openGraph: {
    title: "CallAutomate: AI that answers, chats and takes orders",
    description:
      "Never miss an order again. AI voice agents, chatbots and ordering websites wired into your POS.",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("ca-rm")=="1")document.documentElement.classList.add("rm")}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
