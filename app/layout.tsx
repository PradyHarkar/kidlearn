import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "KidLearn - Fun Learning for Kids!",
  description: "Adaptive Maths and English learning platform for Prep and Year 3 students",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌟</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#fff",
                color: "#1a1a2e",
                fontFamily: "'Nunito', sans-serif",
                fontWeight: "700",
                borderRadius: "16px",
                padding: "12px 20px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
