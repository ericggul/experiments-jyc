"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { navigationMenus, type NavigationMenu } from "../model/navigation";
import styles from "./github-home.module.css";

type UtilityDialog = "search" | "sign-in" | "sign-up" | "download" | null;

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <circle cx="16" cy="16" fill="currentColor" r="14" />
      <path d="m10 12.4 4.2 3.6L10 19.6M17.1 20.1h5.2" fill="none" stroke="#0b103e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
    </svg>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4.5 6 3.5 3.5L11.5 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" fill="none" r="5.7" />
      <path d="m15 15 4.3 4.3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

function NavigationPanel({ menu, onChoose }: { menu: NavigationMenu; onChoose: () => void }) {
  return (
    <section aria-label={`${menu.label} menu`} className={styles.navigationPanel}>
      <div className={styles.menuGroups}>
        {menu.groups.map((group) => (
          <section className={styles.menuGroup} key={group.id}>
            <h2>{group.label}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button onClick={onChoose} type="button">
                    <strong>{item.title}</strong>
                    {item.description ? <span>{item.description}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <button className={styles.menuFooter} onClick={onChoose} type="button">
        <span>View all features</span>
        <ArrowIcon />
      </button>
    </section>
  );
}

function Dialog({ children, label, onClose }: { children: ReactNode; label: string; onClose: () => void }) {
  return (
    <section aria-label={label} className={styles.dialogBackdrop} role="dialog">
      <button aria-label="Close dialog" className={styles.dialogDismiss} onClick={onClose} type="button" />
      <div className={styles.dialogCard}>
        <button aria-label="Close" className={styles.dialogClose} onClick={onClose} type="button">
          <CloseIcon />
        </button>
        {children}
      </div>
    </section>
  );
}

function UtilityDialogView({ kind, onClose }: { kind: Exclude<UtilityDialog, null>; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const title = {
    search: "Search GitHub",
    "sign-in": "Sign in",
    "sign-up": "Join GitHub",
    download: "Download GitHub Copilot app",
  }[kind];

  if (kind === "download") {
    return (
      <Dialog label={title} onClose={onClose}>
        <span className={styles.dialogEyebrow}>GitHub Copilot app</span>
        <h2>{submitted ? "Your download is ready" : title}</h2>
        <p>{submitted ? "Choose a platform in the production application to continue the download." : "Choose a platform to prepare a local download request."}</p>
        <div className={styles.platformChoices}>
          {[
            { id: "macos", label: "macOS" },
            { id: "windows", label: "Windows" },
            { id: "linux", label: "Linux" },
          ].map((platform) => (
            <button key={platform.id} onClick={() => setSubmitted(true)} type="button">
              {platform.label}
            </button>
          ))}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog label={title} onClose={onClose}>
      <span className={styles.dialogEyebrow}>{kind === "search" ? "Explore GitHub" : "GitHub account"}</span>
      <h2>{submitted ? (kind === "search" ? "Search prepared" : "Continue securely") : title}</h2>
      <p>{submitted ? (kind === "search" ? "Search is represented locally in this reconstruction." : "Authentication is intentionally not connected in this local reconstruction.") : kind === "search" ? "Find repositories, issues, users, and discussions." : "Enter an email to continue."}</p>
      {!submitted ? (
        <form
          className={styles.dialogForm}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label htmlFor={`github-${kind}-input`}>{kind === "search" ? "Search" : "Email address"}</label>
          <input id={`github-${kind}-input`} placeholder={kind === "search" ? "Search GitHub" : "you@domain.com"} required type={kind === "search" ? "search" : "email"} />
          <button type="submit">{kind === "search" ? "Search" : "Continue"}</button>
        </form>
      ) : null}
    </Dialog>
  );
}

export function GitHubHome() {
  const [activeMenu, setActiveMenu] = useState<NavigationMenu["id"] | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [utilityDialog, setUtilityDialog] = useState<UtilityDialog>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const selectedMenu = navigationMenus.find((menu) => menu.id === activeMenu) ?? null;
  const closeNavigation = () => {
    setActiveMenu(null);
    setMobileNavigationOpen(false);
  };
  const openUtility = (kind: Exclude<UtilityDialog, null>) => {
    closeNavigation();
    setUtilityDialog(kind);
  };

  return (
    <main className={styles.experience}>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <button
            aria-expanded={mobileNavigationOpen}
            aria-label="Toggle navigation"
            className={styles.mobileToggle}
            onClick={() => {
              setMobileNavigationOpen((open) => !open);
              setActiveMenu(null);
            }}
            type="button"
          >
            <MenuIcon open={mobileNavigationOpen} />
          </button>
          <button aria-label="Homepage" className={styles.brandMark} onClick={closeNavigation} type="button">
            <Mark />
          </button>
          <nav aria-label="Primary navigation" className={styles.desktopNavigation}>
            {navigationMenus.map((menu) => (
              <button
                aria-expanded={activeMenu === menu.id}
                className={activeMenu === menu.id ? styles.navigationActive : ""}
                key={menu.id}
                onClick={() => setActiveMenu((active) => (active === menu.id ? null : menu.id))}
                type="button"
              >
                {menu.label}
                <Chevron />
              </button>
            ))}
            <button onClick={closeNavigation} type="button">Pricing</button>
          </nav>
          <div className={styles.headerActions}>
            <button aria-label="Search" className={styles.searchButton} onClick={() => openUtility("search")} type="button">
              <SearchIcon />
              <span>Search</span>
              <kbd>/</kbd>
            </button>
            <button className={styles.signInButton} onClick={() => openUtility("sign-in")} type="button">Sign in</button>
            <button className={styles.signUpButton} onClick={() => openUtility("sign-up")} type="button">Sign up</button>
          </div>
        </div>
        {selectedMenu && !mobileNavigationOpen ? <NavigationPanel menu={selectedMenu} onChoose={closeNavigation} /> : null}
        {mobileNavigationOpen ? (
          <section aria-label="Navigation menu" className={styles.mobileNavigation}>
            {navigationMenus.map((menu) => (
              <section key={menu.id}>
                <button
                  aria-expanded={activeMenu === menu.id}
                  onClick={() => setActiveMenu((active) => (active === menu.id ? null : menu.id))}
                  type="button"
                >
                  {menu.label}
                  <Chevron />
                </button>
                {activeMenu === menu.id ? <NavigationPanel menu={menu} onChoose={closeNavigation} /> : null}
              </section>
            ))}
            <button onClick={closeNavigation} type="button">Pricing</button>
            <button onClick={() => openUtility("search")} type="button">Search</button>
            <button onClick={() => openUtility("sign-up")} type="button">Sign up</button>
          </section>
        ) : null}
      </header>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.atmosphere}>
          <i className={`${styles.actor} ${styles.actorRobot}`} />
          <i className={`${styles.actor} ${styles.actorCat}`} />
          <i className={`${styles.actor} ${styles.actorDucky}`} />
          <i className={styles.starField} />
          <div className={styles.codeWindow}>
            <div className={styles.windowTabs}><span>game.ts</span><span>characters.module.css</span><span>bonus-level.ts</span></div>
            <pre>{"function gatherTeam() {\n  return [developer, agent, code]\n    .filter(Boolean);\n}"}</pre>
          </div>
        </div>
        <div className={styles.heroCopy}>
          <h1>The future of building<br />happens together</h1>
          <p>Tools and trends evolve, but collaboration endures. With GitHub, developers, agents, and code come together on one platform.</p>
          <div className={styles.heroActions}>
            {emailSubmitted ? (
              <p className={styles.emailFeedback} role="status">Your email is ready to continue.</p>
            ) : (
              <form
                className={styles.emailForm}
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  setEmailSubmitted(true);
                }}
              >
                <label className={styles.screenReaderOnly} htmlFor="github-email">Enter your email</label>
                <input autoComplete="email" id="github-email" placeholder="Enter your email" required type="email" />
                <button type="submit">Sign up for GitHub</button>
              </form>
            )}
            <button className={styles.copilotButton} onClick={() => openUtility("download")} type="button">Download GitHub Copilot app</button>
          </div>
        </div>
      </section>

      {utilityDialog ? <UtilityDialogView kind={utilityDialog} onClose={() => setUtilityDialog(null)} /> : null}
    </main>
  );
}
