import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SkyBackdrop, SkyStars } from "@/components/site/sky-backdrop";
import { TrackingRoot } from "@/components/tracking/tracking-root";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#conteudo"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <SkyStars />
      <SiteHeader />
      <main id="conteudo" className="relative isolate flex-1 overflow-x-clip">
        <SkyBackdrop />
        {children}
      </main>
      <SiteFooter />
      <TrackingRoot />
    </>
  );
}
