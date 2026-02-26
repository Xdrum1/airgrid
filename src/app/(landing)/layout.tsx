// Landing route group layout — overrides overflow:hidden so the page scrolls
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { overflow: auto !important; }`}</style>
      {children}
    </>
  );
}
