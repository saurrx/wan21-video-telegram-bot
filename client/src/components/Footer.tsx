import { SiCloudflare } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="py-6 px-4 border-t-4 border-black mt-12">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-lg font-bold">
        Powered by
        <SiCloudflare className="h-6 w-6" />
        Spheron
      </div>
    </footer>
  );
}