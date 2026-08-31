import {
  prepareChangelogEntries,
  type ChangelogEntry,
} from "../domain/changelog";

const rawChangelogEntries = [
  {
    date: "2026-08-31",
    title: "Notes のカテゴリ別一覧を追加",
    description:
      "Notes のカテゴリから、同じカテゴリの記事をまとめて探せるようになりました。",
    link: {
      kind: "internal",
      path: "notes/",
    },
  },
  {
    date: "2026-08-31",
    title: "Notes の記事導線を改善",
    description:
      "記事詳細から、前後の記事や同じカテゴリの関連記事へ移動できるようにしました。",
    link: {
      kind: "internal",
      path: "notes/",
    },
  },
  {
    date: "2026-08-24",
    title: "アクセス解析を追加",
    description:
      "Google Analytics によるアクセス解析を追加し、Privacy Policy から計測設定を変更できるようにしました。",
    link: {
      kind: "internal",
      path: "privacy/",
    },
  },
  {
    date: "2026-08-23",
    title: "Privacy Policy を追加",
    description:
      "コメント機能で利用する GitHub Discussions など、サイトが扱う情報についての案内を追加しました。",
    link: {
      kind: "internal",
      path: "privacy/",
    },
  },
  {
    date: "2026-08-22",
    title: "Notes にコメント欄を追加",
    description:
      "Notes で、GitHub Discussions を使ったコメントとリアクションを利用できるようにしました。",
  },
  {
    date: "2026-08-21",
    title: "Home の情報設計とデザインを改善",
    description:
      "サイトの案内、現在取り組んでいること、最近の更新を整理し、目的のページへ移動しやすくしました。",
  },
  {
    date: "2026-08-20",
    title: "Changelog ページを追加",
    description:
      "サイトと制作物の主要な更新を、時系列で確認できるようになりました。",
  },
  {
    date: "2026-08-19",
    title: "モバイル向けナビゲーションを改善",
    description:
      "小さな画面でもサイト内を移動しやすい、開閉式のメニューを追加しました。",
  },
  {
    date: "2026-08-17",
    title: "Contact ページを追加",
    description: "連絡先と、お問い合わせ時に必要な情報をまとめました。",
    link: {
      kind: "internal",
      path: "contact/",
    },
  },
  {
    date: "2026-08-15",
    title: "Notes を公開",
    description: "技術メモや日々の記録を掲載する Notes を追加しました。",
    link: {
      kind: "internal",
      path: "notes/",
    },
  },
  {
    date: "2026-08-15",
    title: "Works ページを追加",
    description: "個人で制作・運用しているプロダクトの紹介を追加しました。",
    link: {
      kind: "internal",
      path: "works/",
    },
  },
  {
    date: "2026-08-12",
    title: "独自ドメインで公開",
    description:
      "workingcorgi.com でサイトを公開し、GitHub と X のプロフィールを整えました。",
  },
  {
    date: "2026-08-10",
    title: "About ページを追加",
    description:
      "経歴や得意分野、現在取り組んでいることを紹介するページを追加しました。",
    link: {
      kind: "internal",
      path: "about/",
    },
  },
  {
    date: "2026-08-10",
    title: "Working Corgi を公開",
    description: "個人サイトのトップページと共通デザインを公開しました。",
  },
] as const satisfies readonly ChangelogEntry[];

export const changelogEntries = prepareChangelogEntries(rawChangelogEntries);
