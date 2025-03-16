import Footer from "./Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-['Space_Grotesk']">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
