import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader, SiteFooter } from "../components/prom/SiteChrome";
import GlitterWrap from "../components/originkit/ui/glitterwrap";
import GlowCursor from "../components/reactbits/GlowCursor";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center border border-rule p-8 rounded-sm bg-card/60">
        <h1 className="font-display text-6xl text-ink">404</h1>
        <h2 className="mt-3 font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Vector Not Found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested coordinate or forensic view does not exist in the twin.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-defense px-4 py-2 font-mono text-xs uppercase tracking-widest text-defense transition-colors hover:bg-defense hover:text-ink"
          >
            Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center border border-attack p-8 rounded-sm bg-card/60">
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Diagnostic Interrupt
        </h1>
        <p className="mt-2 font-mono text-xs text-attack">
          {error.message || "An unexpected client exception occurred."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border border-defense px-4 py-2 font-mono text-xs uppercase tracking-widest text-defense transition-colors hover:bg-defense hover:text-ink"
          >
            Retry Execution
          </button>
          <a
            href="/"
            className="border border-rule px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
          >
            Reset Root
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#08080c" },
      { title: "PROMETHEUS — Adversarial Fraud Simulation & Forensic Intelligence Twin" },
      {
        name: "description",
        content:
          "Closed-loop financial digital twin, decontaminated adversarial attack benchmarks, deep-path structured scoring, and PCAT agentic payment rails.",
      },
      {
        name: "keywords",
        content:
          "Prometheus, adversarial fraud twin, AMLSim, PCAT, payment constrained agent token, graph neural networks, structured weights, financial forensic intelligence",
      },
      { name: "author", content: "Prometheus Intelligence" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "PROMETHEUS — Adversarial Fraud Simulation Twin" },
      {
        property: "og:description",
        content:
          "Zero-mock adversarial fraud simulation twin, decontaminated evaluations, deep-path structured scoring, and PCAT agentic payment verification.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PROMETHEUS Fraud Twin" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PROMETHEUS — Adversarial Fraud Simulation Twin" },
      {
        name: "twitter:description",
        content:
          "Closed-loop financial digital twin, decontaminated adversarial attack benchmarks, deep-path structured scoring, and PCAT agentic payment rails.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-transparent text-ink antialiased selection:bg-attack-dim selection:text-ink min-h-screen flex flex-col">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <GlowCursor
        color="#67E8F9"
        secondaryColor="#A78BFA"
        trailLength={40}
        trailWidth={8}
        trailTaper={0.8}
        followSpeed={0.16}
        glowIntensity={1.9}
        glowSpread={1.2}
        hotspot={0.65}
        brightness={1.25}
        opacity={1}
        pulseSpeed={1.1}
        noiseStrength={0.035}
        idleFade
        idleTimeout={700}
        fadeDuration={900}
        blendMode="screen"
      />
      <div className="fixed inset-0 -z-10 pointer-events-none w-full h-full bg-[#08080c] overflow-hidden" aria-hidden="true">
        <GlitterWrap
          particleCount={550}
          color1="#ffffff"
          color2="#d8e1ff"
          color3="#e8d5ff"
          speed={3}
          density={70}
          starSize={12}
          focalDepth={13}
          turbulence={0}
          brightness={95}
          glitterIntensity={5}
          trailAmount={65}
          reverse={false}
        />
      </div>
      <SiteHeader />
      <main className="flex-1 relative z-0">
        <Outlet />
      </main>
      <SiteFooter />
    </QueryClientProvider>
  );
}
