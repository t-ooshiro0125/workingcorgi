const siteName = "Working Corgi";

export const site = {
  name: siteName,
  defaultDescription: "ACorgi0125 の個人サイトです。",
  defaultOgp: {
    image: "/og-image.png",
    imageAlt: `${siteName} のロゴと、キャップをかぶったコーギーのイラスト`,
  },
} as const;

export const giscus = {
  repo: "t-ooshiro0125/workingcorgi",
  repoId: "R_kgDOTysT5Q",
  reactionsEnabled: true,
  inputPosition: "top",
  theme: "noborder_light",
  lang: "ja",
} as const;

export const privacyPolicies = {
  github: {
    label: "GitHub のプライバシーに関する声明",
    url: "https://docs.github.com/ja/site-policy/privacy-policies/github-general-privacy-statement",
  },
  giscus: {
    label: "giscus のプライバシーポリシー",
    url: "https://github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md",
  },
  google: {
    label: "Google による情報の扱い",
    url: "https://policies.google.com/technologies/partner-sites?hl=ja",
  },
} as const;

export const profiles = {
  github: {
    label: "GitHub",
    url: "https://github.com/t-ooshiro0125",
    handle: "t-ooshiro0125",
  },
  x: {
    label: "X",
    url: "https://x.com/working_corgi",
    handle: "@working_corgi",
  },
} as const;

export const profileItems = [profiles.github, profiles.x] as const;

const navigationLinks = {
  home: { label: "Home", path: "" },
  about: { label: "About", path: "about/" },
  works: { label: "Works", path: "works/" },
  notes: { label: "Notes", path: "notes/" },
  contact: { label: "Contact", path: "contact/" },
  changelog: { label: "Changelog", path: "changelog/" },
  privacy: { label: "Privacy Policy", path: "privacy/" },
} as const;

export const homeNavigationItems = [
  {
    ...navigationLinks.about,
    description: "経歴や得意分野など、私について詳しく紹介しています。",
  },
  {
    ...navigationLinks.works,
    description: "個人で制作・運用しているプロダクトを紹介しています。",
  },
  {
    ...navigationLinks.notes,
    description: "Web 開発のメモや、日々の記録を掲載しています。",
  },
] as const;

export const headerNavigationItems = [
  navigationLinks.home,
  navigationLinks.about,
  navigationLinks.works,
  navigationLinks.notes,
  navigationLinks.contact,
] as const;

export const footerNavigationItems = [
  navigationLinks.home,
  navigationLinks.about,
  navigationLinks.works,
  navigationLinks.notes,
  navigationLinks.changelog,
  navigationLinks.contact,
  navigationLinks.privacy,
] as const;
