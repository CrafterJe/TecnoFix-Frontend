import { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SplashScreen } from "./features/splash/SplashScreen";
import { UpdaterDialog } from "./tauri/UpdaterDialog";
import { useAuthStore } from "./store/authStore";
import { isTauri } from "./lib/helpers";
import { initUpdater } from "./tauri/updater";

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const updaterPromise = isTauri()
        ? Promise.race([
            initUpdater(),
            new Promise<void>((resolve) => setTimeout(resolve, 5000)),
          ]).catch(console.error)
        : Promise.resolve();

      await Promise.all([initializeAuth(), updaterPromise]);
      setAuthReady(true);
    };
    init();
  }, [initializeAuth]);

  if (!splashDone || !authReady) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <UpdaterDialog />
    </>
  );
}
