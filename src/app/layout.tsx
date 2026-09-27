import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { ActivityProvider } from "@/components/activity/ActivityProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth/dal";
import { toCurrentUser } from "@/lib/auth/types";
import { NONCE_HEADER } from "@/lib/http/contentSecurityPolicy";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { template: "%s · Magistral", default: "Magistral — Minuta com Personalidade" },
  description: "Gere minutas de contratos com o tom de voz certo e baixe em Word ou PDF.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, requestHeaders] = await Promise.all([getCurrentUser(), headers()]);
  // The Content-Security-Policy only lets inline scripts with this request's nonce run.
  const nonce = requestHeaders.get(NONCE_HEADER) ?? undefined;

  return (
    // The theme script adds the "dark" class before React hydrates, so the class list may differ.
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {user ? (
          <ActivityProvider>
            <AppShell user={toCurrentUser(user)}>{children}</AppShell>
          </ActivityProvider>
        ) : (
          // The sign-in and setup pages: no navigation, and nothing to poll.
          children
        )}
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
