import { RouterProvider, createBrowserRouter } from "react-router";

import { NotFoundPage } from "./components/NotFoundPage";
import { Dashboard } from "./features/dashboard/components/Dashboard";
import { TrashPage } from "./features/dashboard/components/TrashPage";
import { EditorStatusScreen } from "./features/editor/components/EditorStatusScreen";

/**
 * URL routes. Real URLs mean refresh keeps your place, the back button works,
 * and an event can be linked to directly. (Static hosts must rewrite unknown
 * paths to index.html — see "Deploying" in the README.)
 */
const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/trash", element: <TrashPage /> },
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
  {
    // The door list for the day: no canvas, so it doesn't load Konva.
    path: "/events/:eventId/check-in",
    lazy: async () => {
      const { CheckInRoute } = await import("./features/checkin/components/CheckInRoute");
      return { Component: CheckInRoute };
    },
    hydrateFallbackElement: <EditorStatusScreen status="loading" />,
  },
  {
    // Read-only: the seating chart, find-your-seat and print views. No Konva.
    path: "/events/:eventId/view",
    lazy: async () => {
      const { ViewerRoute } = await import("./features/viewer/components/ViewerRoute");
      return { Component: ViewerRoute };
    },
    hydrateFallbackElement: <EditorStatusScreen status="loading" />,
  },
  { path: "*", element: <NotFoundPage /> },
]);

/** Root shell. */
export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
