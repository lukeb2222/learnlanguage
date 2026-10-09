import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { UserProvider } from "@/components/UserProvider";
import { LoadingScreen } from "@/components/ui";
import { RouterProvider, splitHref, useRouterState } from "./router";

import Landing from "@/app/page";
import Login from "@/app/login/page";
import Signup from "@/app/signup/page";
import Welcome from "@/app/welcome/page";
import Learn from "@/app/learn/page";
import LessonPage from "@/app/lesson/page";
import Practice from "@/app/practice/page";
import Stories from "@/app/stories/page";
import StoryPlay from "@/app/stories/play/page";
import Tutor from "@/app/tutor/page";
import Leaderboard from "@/app/leaderboard/page";
import Quests from "@/app/quests/page";
import Shop from "@/app/shop/page";
import Profile from "@/app/profile/page";
import Settings from "@/app/settings/page";
import Words from "@/app/words/page";
import Letters from "@/app/letters/page";
import Research from "@/app/research/page";
import PublicProfile from "@/app/u/[username]/page";

const ROUTES: Record<string, React.ComponentType> = {
  "/": Landing,
  "/login": Login,
  "/signup": Signup,
  "/welcome": Welcome,
  "/learn": Learn,
  "/lesson": LessonPage,
  "/practice": Practice,
  "/stories": Stories,
  "/stories/play": StoryPlay,
  "/tutor": Tutor,
  "/leaderboard": Leaderboard,
  "/quests": Quests,
  "/shop": Shop,
  "/profile": Profile,
  "/settings": Settings,
  "/words": Words,
  "/letters": Letters,
  "/research": Research,
};

// `use(params)` needs a stable promise per value.
const paramPromises = new Map<string, Promise<{ username: string }>>();
function paramsFor(username: string) {
  let p = paramPromises.get(username);
  if (!p) {
    p = Promise.resolve({ username });
    paramPromises.set(username, p);
  }
  return p;
}

function Routes() {
  const { href } = useRouterState();
  const { path } = splitHref(href);
  if (path.startsWith("/u/")) {
    return <PublicProfile key={href} params={paramsFor(decodeURIComponent(path.slice(3)))} />;
  }
  const Page = ROUTES[path] ?? Landing;
  return <Page key={href} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider initial="/">
      <UserProvider>
        <Suspense fallback={<LoadingScreen title="Loading…" />}>
          <Routes />
        </Suspense>
      </UserProvider>
    </RouterProvider>
  </StrictMode>,
);
