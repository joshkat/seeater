import { RouterProvider, createBrowserRouter } from "react-router";

import { NotFoundPage } from "./components/NotFoundPage";
import { Dashboard } from "./features/dashboard/components/Dashboard";
import { EditorStatusScreen } from "./features/editor/components/EditorStatusScreen";

/**
 * URL routes. Real URLs mean refresh keeps your place, the back button works,
 * and an event can be linked to directly. (Static hosts must rewrite unknown
 * paths to index.html — see "Deploying" in the README.)
 */
const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  {
    path: "/events/:eventId",
    // The editor (and the Konva canvas library) is code-split: the dashboard
    // loads without it, and it's fetched the first time an event is opened.
    lazy: async () => {
      const { EditorRoute } = await import("./features/editor/components/EditorRoute");
      return { Component: EditorRoute };
    },
    hydrateFallbackElement: <EditorStatusScreen status="loading" />,
  },
  { path: "*", element: <NotFoundPage /> },
]);

/** Root shell. */
export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
