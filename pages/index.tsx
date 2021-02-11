import React from "react";
import { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Button, Spin } from "antd";
import { connect } from "react-redux";
import { RootState, Dispatch } from "@/utils/store";

import usePosts from "@/queries/usePosts";
import useLogin from "@/mutations/useLogin";

interface Props {
  authenticated: RootState["auth"]["authenticated"];
}
const mapState = (state: RootState) => ({
  authenticated: state.auth.authenticated,
});

// const mapDispatch = (dispatch: Dispatch) => ({
//     increment: () => dispatch.auth.increment(1),
//     incrementAsync: () => dispatch.auth.incrementAsync(1),
// })
const Home: NextPage<Props> = ({ authenticated }) => {
  const { data, isError, isLoading } = usePosts();
  const loginMutation = useLogin();
  if (isLoading) {
    return <Spin size="large" />;
  }
  if (isError) {
    return <p>Error...</p>;
  }
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <p className="bg-primary">
          Get started by editing{" "}
          <code className={styles.code}>pages/index.js</code>
        </p>
        <Button
          type="primary"
          size="large"
          disabled={authenticated}
          loading={loginMutation.isLoading}
          onClick={async () =>
            loginMutation.mutate({
              username: "luigi@example.com",
              password: "blahblah",
              remember: false,
            })
          }
        >
          Blah
        </Button>
        <div>
          {data?.map((post) => (
            <p key={post.id}>{post.title}</p>
          ))}
        </div>

        <p className={styles.description}>
          Get started by editing{" "}
          <code className={styles.code}>pages/index.js</code>
        </p>

        <div className={styles.grid}>
          <a href="https://nextjs.org/docs" className={styles.card}>
            <h3>Documentation &rarr;</h3>
            <p>Find in-depth information about Next.js features and API.</p>
          </a>

          <a href="https://nextjs.org/learn" className={styles.card}>
            <h3>Learn &rarr;</h3>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </a>

          <a
            href="https://github.com/vercel/next.js/tree/master/examples"
            className={styles.card}
          >
            <h3>Examples &rarr;</h3>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
          >
            <h3>Deploy &rarr;</h3>
            <p>
              Instantly deploy your Next.js site to a public URL with Vercel.
            </p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
        </a>
      </footer>
    </div>
  );
};

export default connect(mapState)(Home);
