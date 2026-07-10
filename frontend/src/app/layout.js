import "./globals.css";

export const metadata = {
  title: "Zoom Clone",
  description: "A Zoom-style video conferencing app (SDE Fullstack Assignment)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
