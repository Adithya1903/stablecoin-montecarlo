import {
  identity,
  links,
  nav,
  projects,
  research,
  about,
  PAPER_LINKS,
} from "@/content";

function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={`text-accent underline-offset-4 hover:underline ${className}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-zinc-50 focus:px-3 focus:py-2 dark:focus:bg-zinc-950"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <a href="#top" className="font-medium tracking-tight">
            {identity.name}
          </a>
          <nav aria-label="Sections">
            <ul className="flex items-center gap-5">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-6">
        {/* Intro */}
        <section id="top" className="pb-16 pt-32 sm:pt-36">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {identity.name}
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
            {identity.tagline}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {identity.location}
          </p>
        </section>

        {/* Projects */}
        <section id="projects" className="fade-up border-t border-zinc-200 py-16 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {projects.map((project) => (
              <article key={project.id} id={project.id} className="fade-up py-10">
                <h3 className="text-xl font-semibold tracking-tight">
                  <a href={`#${project.id}`} className="hover:text-accent">
                    {project.name}
                  </a>
                </h3>
                <p className="mt-2 font-medium text-zinc-800 dark:text-zinc-200">
                  {project.oneLiner}
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {project.meta}
                </p>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {project.paragraphs.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
                {project.links.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {project.links.map((link) => (
                      <li key={link.href}>
                        <ExternalLink href={link.href}>{link.label}</ExternalLink>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Research */}
        <section id="research" className="fade-up border-t border-zinc-200 py-16 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold tracking-tight">Research</h2>
          <p className="mt-6 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {research.whitePaper}
          </p>
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            {research.papersIntro}
          </p>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
            {research.papers.map((paper) => {
              const href = PAPER_LINKS[paper.title];
              return (
                <li key={paper.title}>
                  {href ? (
                    <ExternalLink href={href} className="font-medium">
                      {paper.title}
                    </ExternalLink>
                  ) : (
                    <span className="font-medium">{paper.title}</span>
                  )}
                  <span className="text-zinc-500 dark:text-zinc-400"> · {paper.note}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* About */}
        <section id="about" className="fade-up border-t border-zinc-200 py-16 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold tracking-tight">About</h2>
          <p className="mt-6 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {about.join(" ")}
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-10">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{identity.name}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </>
  );
}
