import Head from "next/head";

interface Props {
  pageTitle: string;
  pageDescription?: string;
}

const SEO: React.FC<Props> = ({ pageTitle, pageDescription }) => {
  const title = pageTitle ? `${pageTitle} | MuallimLive` : "MuallimLive";
  const description = pageDescription || "Al-Qur'an reader";

  return (
    <Head>
      <title>{title}</title>
      <meta property="og:title" content={title} />
      <meta name="twitter:title" content={title} />
      <meta name="description" content={description} />
      <meta property="og:description" content={description} />
      <meta name="twitter:description" content={description} />
    </Head>
  );
};

export default SEO;
