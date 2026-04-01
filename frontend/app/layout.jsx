import "./globals.css";

export const metadata = {
  title: "Autonomous AI DevOps Engineer",
  description: "Self-healing cloud monitoring dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
