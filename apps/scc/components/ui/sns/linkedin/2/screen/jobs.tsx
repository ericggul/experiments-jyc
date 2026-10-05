import type { ChangeEvent, CSSProperties, ReactNode, UIEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { linkedinJobs } from "../model/jobs.generated";
import type { LinkedinJob } from "../model/job-types";
import { LinkedinIcon } from "./icons";
import styles from "./linkedin.module.css";

type DatePosted = "Any time" | "Past 24 hours" | "Past week" | "Past month";
type FilterMenu = "date" | "experience" | "company" | "all" | null;
type SortMode = "Most relevant" | "Most recent";

const datePostedOptions: DatePosted[] = ["Any time", "Past 24 hours", "Past week", "Past month"];
const experienceOptions = ["Internship", "Entry level", "Associate", "Mid-Senior level", "Director"];
const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const companyTones: Record<string, string> = {
  Airtable: "#2d7ff9",
  Asana: "#f06a6a",
  Brex: "#1f7a8c",
  Cloudflare: "#f48120",
  Coinbase: "#1652f0",
  Datadog: "#632ca6",
  Discord: "#5865f2",
  Duolingo: "#58a700",
  Figma: "#f24e1e",
  Intercom: "#1f8ded",
  Lyft: "#ff00bf",
  Reddit: "#ff4500",
  "Scale AI": "#151515",
  Stripe: "#635bff",
  Vercel: "#171717",
  Webflow: "#4353ff",
};

function shortDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function seniorityFor(job: LinkedinJob) {
  const title = job.title.toLowerCase();
  if (/(intern|apprentice|graduate)/.test(title)) return "Internship";
  if (/(vice president|\bvp\b|director|head of)/.test(title)) return "Director";
  if (/(principal|staff|senior|lead|manager)/.test(title)) return "Mid-Senior level";
  if (/(associate|analyst|specialist)/.test(title)) return "Associate";
  return "Entry level";
}

function descriptionPreview(description: string) {
  const flattened = description.replace(/\s+/g, " ").trim();
  const ending = flattened.slice(0, 180).lastIndexOf(" ");
  return `${flattened.slice(0, ending > 90 ? ending : 180)}…`;
}

function CompanyMark({ company, large = false }: { company: string; large?: boolean }) {
  return <span aria-hidden="true" className={`${styles.companyMark} ${large ? styles.companyMarkLarge : ""}`} style={{ "--company-tone": companyTones[company] ?? "#56687a" } as CSSProperties}>{company.slice(0, 1)}</span>;
}

function JobListItem({
  arrivalDuration,
  arriving,
  job,
  onChoose,
  saved,
  selected,
}: {
  arrivalDuration: number;
  arriving: boolean;
  job: LinkedinJob;
  onChoose: () => void;
  saved: boolean;
  selected: boolean;
}) {
  const arrivalStyle = arriving ? { "--job-arrival-duration": `${arrivalDuration}ms` } as CSSProperties : undefined;
  return <button aria-current={selected ? "true" : undefined} className={`${styles.jobListItem} ${selected ? styles.selectedJob : ""} ${arriving ? styles.arrivingJob : ""}`} onClick={onChoose} style={arrivalStyle} type="button">
    <CompanyMark company={job.company} />
    <span className={styles.jobListCopy}>
      <strong>{job.title}</strong>
      <b>{job.company}</b>
      <em>{job.location} · {job.workplace}</em>
      <small>{job.employment} · Listed {shortDate(job.postedAt)}</small>
      <span className={styles.jobListDescription}>{descriptionPreview(job.description)}</span>
    </span>
    {saved ? <LinkedinIcon className={styles.savedMark} name="bookmark" solid /> : null}
  </button>;
}

function JobDetail({
  job,
  onBack,
  onSave,
  saved,
}: {
  job: LinkedinJob;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const paragraphs = job.description.split("\n").map((paragraph) => paragraph.trim()).filter(Boolean);
  return <article aria-label={`${job.title} at ${job.company}`} className={styles.jobDetail}>
    <button aria-label="Back to jobs" className={styles.mobileJobBack} onClick={onBack} type="button">‹</button>
    <div className={styles.jobDetailHero}><CompanyMark company={job.company} large /><div><h1>{job.title}</h1><strong>{job.company}</strong><p>{job.location} · {job.workplace}</p><small>Listed {shortDate(job.postedAt)} · {job.employment}</small></div></div>
    <div className={styles.jobDetailActions}><a href={job.applicationUrl} rel="noreferrer" target="_blank">Apply on company site</a><button aria-label={saved ? "Remove saved job" : "Save job"} className={saved ? styles.detailSaved : ""} onClick={onSave} type="button"><LinkedinIcon name="bookmark" solid={saved} /></button></div>
    <section className={styles.aboutJob}><h2>About the job</h2>{paragraphs.map((paragraph, index) => <p key={`${job.id}-description-${index}`}>{paragraph}</p>)}</section>
    <section className={styles.jobDetails}><h2>Job details</h2><div><LinkedinIcon name="briefcase" /><span><small>Employment type</small><b>{job.employment}</b></span></div><div><LinkedinIcon name="location" /><span><small>Workplace type</small><b>{job.workplace}</b></span></div><div><LinkedinIcon name="briefcase" /><span><small>Job function</small><b>{job.team}</b></span></div><div><LinkedinIcon name="briefcase" /><span><small>Seniority level</small><b>{seniorityFor(job)}</b></span></div></section>
    <p className={styles.jobSource}>Application continues on {job.company}&rsquo;s careers site.</p>
  </article>;
}

function FilterChoice({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`${styles.filterChoice} ${active ? styles.filterChoiceActive : ""}`} onClick={onClick} type="button"><span>{children}</span>{active ? <span aria-hidden="true">✓</span> : null}</button>;
}

export function LinkedinJobsScreen({
  onQueryChange,
  onToast,
  query,
}: {
  onQueryChange: (value: string) => void;
  onToast: (message: string) => void;
  query: string;
}) {
  const [location, setLocation] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("Most relevant");
  const [datePosted, setDatePosted] = useState<DatePosted>("Any time");
  const [experience, setExperience] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [workplace, setWorkplace] = useState<"All" | LinkedinJob["workplace"]>("All");
  const [easyApply, setEasyApply] = useState(false);
  const [filterMenu, setFilterMenu] = useState<FilterMenu>(null);
  const [alertOn, setAlertOn] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState(linkedinJobs[0]?.id ?? "");
  const [visibleCount, setVisibleCount] = useState(24);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchStartedAt] = useState(() => Date.now());
  const [liveStreamOn, setLiveStreamOn] = useState(true);
  const [streamInterval, setStreamInterval] = useState(50);
  const [streamCursor, setStreamCursor] = useState(0);
  const [arrivalCount, setArrivalCount] = useState(0);

  const effectiveInterval = Math.min(200, Math.max(20, streamInterval));
  const streamedJobs = useMemo(() => Array.from(
    { length: linkedinJobs.length },
    (_, offset) => linkedinJobs[(streamCursor - offset + linkedinJobs.length) % linkedinJobs.length],
  ), [streamCursor]);

  const filteredJobs = useMemo(() => {
    const titleQuery = query.trim().toLowerCase();
    const locationQuery = location.trim().toLowerCase();
    const elapsed = { "Any time": Infinity, "Past 24 hours": 86_400_000, "Past week": 604_800_000, "Past month": 2_592_000_000 }[datePosted];
    return linkedinJobs.filter((job) => {
      const searchText = `${job.title} ${job.company} ${job.team} ${job.description}`.toLowerCase();
      const matchesTitle = !titleQuery || searchText.includes(titleQuery);
      const matchesLocation = !locationQuery || job.location.toLowerCase().includes(locationQuery);
      const matchesDate = searchStartedAt - new Date(job.postedAt).getTime() <= elapsed;
      const matchesExperience = !experience.length || experience.includes(seniorityFor(job));
      const matchesCompany = !companies.length || companies.includes(job.company);
      const matchesWorkplace = workplace === "All" || job.workplace === workplace;
      return matchesTitle && matchesLocation && matchesDate && matchesExperience && matchesCompany && matchesWorkplace && !easyApply;
    });
  }, [companies, datePosted, easyApply, experience, location, query, searchStartedAt, workplace]);

  const filteredJobIds = useMemo(() => new Set(filteredJobs.map((job) => job.id)), [filteredJobs]);
  const results = useMemo(() => {
    if (liveStreamOn || sortMode === "Most relevant") return streamedJobs.filter((job) => filteredJobIds.has(job.id));
    return [...filteredJobs].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  }, [filteredJobIds, filteredJobs, liveStreamOn, sortMode, streamedJobs]);

  const latestJobId = linkedinJobs[streamCursor]?.id;
  const selected = liveStreamOn
    ? results.find((job) => job.id === latestJobId) ?? results[0]
    : results.find((job) => job.id === selectedId) ?? results[0];
  const visibleJobs = results.slice(0, visibleCount);
  const activeFilters = Number(datePosted !== "Any time") + experience.length + companies.length + Number(workplace !== "All") + Number(easyApply);

  useEffect(() => {
    if (!liveStreamOn) return;
    const timer = window.setInterval(() => {
      setStreamCursor((cursor) => (cursor + 1) % linkedinJobs.length);
      setArrivalCount((count) => count + 1);
    }, effectiveInterval);
    return () => window.clearInterval(timer);
  }, [effectiveInterval, liveStreamOn]);

  useEffect(() => {
    const extendMobileList = () => {
      if (window.innerWidth > 760) return;
      if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 900) {
        setVisibleCount((count) => Math.min(results.length, count + 24));
      }
    };
    window.addEventListener("scroll", extendMobileList, { passive: true });
    return () => window.removeEventListener("scroll", extendMobileList);
  }, [results.length]);

  function resetList() {
    setVisibleCount(24);
  }

  function selectJob(job: LinkedinJob) {
    setSelectedId(job.id);
    setMobileDetailOpen(true);
  }

  function toggleSaved() {
    if (!selected) return;
    setSaved((current) => ({ ...current, [selected.id]: !current[selected.id] }));
    onToast(saved[selected.id] ? "Job removed from saved jobs" : "Job saved to My jobs");
  }

  function updateQuery(event: ChangeEvent<HTMLInputElement>) {
    onQueryChange(event.target.value);
    resetList();
  }

  function handleListScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 560) setVisibleCount((count) => Math.min(results.length, count + 24));
  }

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    resetList();
  }

  function clearFilters() {
    setDatePosted("Any time");
    setExperience([]);
    setCompanies([]);
    setWorkplace("All");
    setEasyApply(false);
    setFilterMenu(null);
    resetList();
  }

  function setSpeed(value: number) {
    if (!Number.isFinite(value)) return;
    setStreamInterval(Math.min(200, Math.max(20, Math.round(value))));
  }

  function toggleLiveStream() {
    if (liveStreamOn) {
      setSelectedId(latestJobId ?? "");
      setLiveStreamOn(false);
      onToast("Live job updates paused");
      return;
    }
    setSortMode("Most relevant");
    setLiveStreamOn(true);
    onToast("Live job updates resumed");
  }

  const companiesInData = [...new Set(linkedinJobs.map((job) => job.company))];
  const filterLabel = (base: string, active: boolean) => <>{base}{active ? "" : ""} <LinkedinIcon name="chevron" /></>;

  return <main className={`${styles.jobsShell} ${mobileDetailOpen ? styles.mobileJobDetailOpen : ""}`}>
    <section className={styles.jobsSearchHeader}>
      <div className={styles.jobsSearchFields}><label><LinkedinIcon name="search" /><input aria-label="Search jobs" onChange={updateQuery} placeholder="Search by title, skill, or company" value={query} /></label><label><LinkedinIcon name="location" /><input aria-label="Search location" onChange={(event) => { setLocation(event.target.value); resetList(); }} placeholder="City, state, or country" value={location} /></label><button onClick={() => onToast(`${results.length} jobs found`)} type="button">Search</button></div>
      <div className={styles.jobFilterRail}>
        <button aria-expanded={filterMenu === "date"} className={datePosted !== "Any time" ? styles.selectedJobFilter : ""} onClick={() => setFilterMenu(filterMenu === "date" ? null : "date")} type="button">{filterLabel(datePosted === "Any time" ? "Date posted" : datePosted, datePosted !== "Any time")}</button>
        <button aria-expanded={filterMenu === "experience"} className={experience.length ? styles.selectedJobFilter : ""} onClick={() => setFilterMenu(filterMenu === "experience" ? null : "experience")} type="button">{filterLabel(experience.length ? `${experience.length} experience level${experience.length > 1 ? "s" : ""}` : "Experience level", Boolean(experience.length))}</button>
        <button aria-expanded={filterMenu === "company"} className={companies.length ? styles.selectedJobFilter : ""} onClick={() => setFilterMenu(filterMenu === "company" ? null : "company")} type="button">{filterLabel(companies.length ? `${companies.length} compan${companies.length === 1 ? "y" : "ies"}` : "Company", Boolean(companies.length))}</button>
        <button aria-pressed={easyApply} className={easyApply ? styles.selectedJobFilter : ""} onClick={() => { setEasyApply((value) => !value); resetList(); }} type="button">Easy Apply</button>
        <button aria-expanded={filterMenu === "all"} className={`${styles.allFilters} ${workplace !== "All" ? styles.selectedJobFilter : ""}`} onClick={() => setFilterMenu(filterMenu === "all" ? null : "all")} type="button"><LinkedinIcon name="sliders" /> All filters{activeFilters ? ` (${activeFilters})` : ""}</button>
      </div>
      {filterMenu ? <div className={styles.jobFilterMenu}>
        {filterMenu === "date" ? <><strong>Date posted</strong>{datePostedOptions.map((option) => <FilterChoice active={datePosted === option} key={option} onClick={() => { setDatePosted(option); setFilterMenu(null); resetList(); }}>{option}</FilterChoice>)}</> : null}
        {filterMenu === "experience" ? <><strong>Experience level</strong>{experienceOptions.map((option) => <FilterChoice active={experience.includes(option)} key={option} onClick={() => toggleValue(option, experience, setExperience)}>{option}</FilterChoice>)}</> : null}
        {filterMenu === "company" ? <><strong>Company</strong><div className={styles.companyChoices}>{companiesInData.map((company) => <FilterChoice active={companies.includes(company)} key={company} onClick={() => toggleValue(company, companies, setCompanies)}>{company}</FilterChoice>)}</div></> : null}
        {filterMenu === "all" ? <><div className={styles.filterMenuHeading}><strong>All filters</strong>{activeFilters ? <button onClick={clearFilters} type="button">Clear</button> : null}</div><span className={styles.filterMenuLabel}>Workplace type</span>{(["All", "On-site", "Hybrid", "Remote"] as const).map((option) => <FilterChoice active={workplace === option} key={option} onClick={() => { setWorkplace(option); resetList(); }}>{option}</FilterChoice>)}</> : null}
      </div> : null}
    </section>
    <div className={styles.jobsWorkspace}>
      <section className={styles.jobsResults}>
        <header><div><h1>Jobs for you</h1><p>{results.length.toLocaleString()} results</p></div><label className={styles.jobAlert}><span>Set alert</span><input checked={alertOn} onChange={(event) => { setAlertOn(event.target.checked); onToast(event.target.checked ? "Job alert created" : "Job alert paused"); }} type="checkbox" /><i /></label></header>
        <div className={styles.jobSort}><span>Based on your profile and preferences</span><button onClick={() => { setLiveStreamOn(false); setSortMode((value) => value === "Most relevant" ? "Most recent" : "Most relevant"); }} type="button">Sort by: <b>{sortMode}</b> <LinkedinIcon name="chevron" /></button></div>
        <div className={styles.jobList} onScroll={handleListScroll}>{visibleJobs.map((job) => <JobListItem arrivalDuration={Math.max(16, Math.round(effectiveInterval * .7))} arriving={liveStreamOn && job.id === latestJobId} job={job} key={job.id} onChoose={() => selectJob(job)} saved={Boolean(saved[job.id])} selected={job.id === selected?.id} />)}{!visibleJobs.length ? <div className={styles.emptyJobs}><strong>No jobs match these filters</strong><span>Try removing a filter or using a broader search.</span><button onClick={clearFilters} type="button">Clear filters</button></div> : null}{visibleJobs.length < results.length ? <div className={styles.loadingJobs}>Scroll to load more jobs</div> : null}</div>
      </section>
      {selected ? <JobDetail job={selected} onBack={() => setMobileDetailOpen(false)} onSave={toggleSaved} saved={Boolean(saved[selected.id])} /> : <section className={styles.jobDetail}><div className={styles.emptyJobs}><strong>Select a job to view details</strong><span>Job details will open here.</span></div></section>}
    </div>
    <details className={styles.jobStreamControls}>
      <summary>job stream <output>{effectiveInterval}ms</output></summary>
      <section aria-label="Job stream controls" className={styles.jobStreamControlBody}>
        <label className={styles.jobStreamSpeed}><span>arrival interval</span><input aria-label="Live update interval in milliseconds" max="200" min="20" onChange={(event) => setSpeed(Number(event.target.value))} step="10" type="range" value={effectiveInterval} /></label>
        <output className={styles.jobStreamCount}>{arrivalCount.toLocaleString()} arrivals</output>
        <button onClick={toggleLiveStream} type="button">{liveStreamOn ? "pause" : "start"}</button>
      </section>
    </details>
  </main>;
}
