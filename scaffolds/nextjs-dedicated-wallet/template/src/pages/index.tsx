import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from '@/components/magic/Login';
import Dashboard from '@/components/ui/Dashboard';
import MagicDashboardRedirect from '@/components/ui/MagicDashboardRedirect';
import MagicProvider, { useMagic } from '@/hooks/MagicProvider';

const HomeContent = () => {
  const { magic } = useMagic();
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      if (magic) {
        // TODO - Figure out the delay in this
        const startTime = performance.now(); // Start time
        const loggedIn = await magic.user.isLoggedIn();
        const endTime = performance.now(); // End time
        console.log(`Check login status took ${endTime - startTime} milliseconds.`);
        setIsLoggedIn(loggedIn);
      }
    };

    checkLoginStatus();
    setToken(localStorage.getItem('token') ?? '');
  }, [magic]);

  return (
    <>
      <ToastContainer />
      {process.env.NEXT_PUBLIC_MAGIC_API_KEY ? (
        token.length > 0 ? (
          <Dashboard token={token} setToken={setToken} />
        ) : (
          <Login token={token} setToken={setToken} />
        )
      ) : (
        <MagicDashboardRedirect />
      )}
    </>
  );
};

export default function Home() {
  return (
    <MagicProvider>
      <HomeContent />
    </MagicProvider>
  );
}
